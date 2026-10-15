"""Structural tests for static M1 studies; these do not judge artistic quality."""
import unittest
import xml.etree.ElementTree as ET
import build
import lin_anchor
import refine_b

NS = {'s': 'http://www.w3.org/2000/svg'}
BUILDERS = [build.paper_cut, build.story_frame, build.ink_gouache]


class ArtStudyTests(unittest.TestCase):
    def test_studies_are_valid_fixed_size_and_deterministic(self):
        for make in BUILDERS:
            with self.subTest(make=make.__name__):
                source = make()
                self.assertEqual(source, make())
                root = ET.fromstring(source)
                self.assertEqual(root.get('viewBox'), '0 0 1280 720')
                self.assertEqual(root.get('width'), '1280')
                self.assertEqual(root.get('height'), '720')
                self.assertIsNotNone(root.find('s:title', NS))
                self.assertIsNotNone(root.find('s:desc', NS))

    def test_story_subjects_prop_grip_caption_and_scene_are_present(self):
        for make in BUILDERS:
            with self.subTest(make=make.__name__):
                root = ET.fromstring(make())
                ids = [e.get('id') for e in root.iter() if e.get('id')]
                self.assertEqual(len(ids), len(set(ids)), 'duplicate SVG IDs')
                for name in ['lin', 'awei', 'thermos', 'visible-grip', 'counter', 'foreground']:
                    self.assertIn(name, ids)
                words = [e.text for e in root.findall('.//s:text', NS)]
                self.assertIn('青云小卖部', words)
                self.assertIn('给。', words)
                for elem in root.iter():
                    self.assertNotIn(elem.tag.split('}')[-1], ['script', 'image', 'animate'])
                    self.assertFalse(any(k.endswith('href') for k in elem.attrib))

    def test_compositions_are_not_shared_layout_recolors(self):
        studies = [make() for make in BUILDERS]
        self.assertEqual(len(set(studies)), 3)
        self.assertIn('id="awning"', studies[0])
        self.assertIn('id="cast-shadows"', studies[1])
        self.assertIn('id="bamboo"', studies[2])
        self.assertIn('id="robe-pigment"', studies[2])
        for marker in ['awning', 'cast-shadows', 'bamboo']:
            self.assertEqual(sum(f'id="{marker}"' in s for s in studies), 1)


class CharacterAnchorTests(unittest.TestCase):
    def test_anchor_is_valid_and_deterministic(self):
        source = lin_anchor.sheet()
        self.assertEqual(source, lin_anchor.sheet())
        root = ET.fromstring(source)
        self.assertEqual(root.get('viewBox'), '0 0 1600 1120')
        ids = [e.get('id') for e in root.iter() if e.get('id')]
        self.assertEqual(len(ids), len(set(ids)))
        for view in ['front', 'quarter', 'side', 'back']:
            self.assertIn(view + '-whole-character', ids)
        for name in ['平静', '说话', '惊讶', '怀疑']:
            self.assertIn(name, source)

    def test_back_view_has_no_facial_features(self):
        self.assertEqual(lin_anchor.eyes('back', 'neutral'), '')
        self.assertEqual(lin_anchor.mouth('back', 'speaking'), '')
        self.assertNotIn('<ellipse', lin_anchor.head('back'))

    def test_studies_are_not_a_production_rig(self):
        source = lin_anchor.sheet()
        self.assertIn('不是生产 rig', source)
        self.assertIn('不是已验证的九口型', source)
        for view in ['front', 'quarter', 'side', 'back']:
            ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">' + lin_anchor.figure(view) + '</svg>')


class CharacterPolishTests(unittest.TestCase):
    def test_true_side_has_only_one_visible_arm_and_hand(self):
        root = ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">' + lin_anchor.figure('side') + '</svg>')
        arms = [e for e in root.iter() if e.get('data-kind') == 'arm']
        hands = [e for e in root.iter() if e.get('data-kind') == 'hand']
        self.assertEqual(len(arms), 1)
        self.assertEqual(len(hands), 1)
        for view in ['front', 'quarter', 'back']:
            other = ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">' + lin_anchor.figure(view) + '</svg>')
            self.assertEqual(sum(e.get('data-kind') == 'arm' for e in other.iter()), 2)

    def test_rest_hand_has_thumb_and_four_named_finger_landmarks(self):
        hand = lin_anchor.rest_hand('front-rest', 0, 0)
        root = ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">' + hand + '</svg>')
        silhouette = next(e for e in root.iter() if e.get('data-anatomy') == 'hand-silhouette')
        self.assertTrue(silhouette.get('d').endswith('Z'))
        landmarks = [e.get('data-finger') for e in root.iter() if e.get('data-finger')]
        self.assertCountEqual(landmarks, ['thumb', 'index', 'middle', 'ring', 'pinky'])

    def test_profile_hand_has_its_own_edge_projection(self):
        ns = '<svg xmlns="http://www.w3.org/2000/svg">'
        edge = ET.fromstring(ns + lin_anchor.profile_hand('edge', 0, 0) + '</svg>')
        front = ET.fromstring(ns + lin_anchor.rest_hand('front', 0, 0) + '</svg>')
        group = next(e for e in edge.iter() if e.get('data-kind') == 'hand')
        self.assertEqual(group.get('data-projection'), 'edge')
        self.assertNotIn('scale', group.get('transform'))
        edge_path = next(e.get('d') for e in edge.iter() if e.get('data-anatomy') == 'hand-silhouette')
        front_path = next(e.get('d') for e in front.iter() if e.get('data-anatomy') == 'hand-silhouette')
        self.assertNotEqual(edge_path, front_path)

    def test_quarter_face_does_not_reuse_old_profile_nose_triangle(self):
        source = lin_anchor.head('quarter')
        self.assertNotIn('L190 92 198 103 188 110', source)
        self.assertNotIn('M179 96L176 108 185 110', source)
        self.assertIn('Q', source)


class ScenePolishTests(unittest.TestCase):
    def test_ordinary_shirt_is_shortened_and_trousers_cover_its_hem(self):
        root = ET.fromstring(refine_b.refined_scene())
        actor = next(e for e in root.iter() if e.get('id') == 'awei')
        paths = [e.get('d', '') for e in actor.iter()]
        self.assertTrue(any('903 440' in p and '817 446' in p for p in paths))
        self.assertTrue(any(p.startswith('M821 432') for p in paths))
        self.assertFalse(any('902 484' in p or '849 478' in p for p in paths))

    def test_refined_scene_preserves_story_and_has_full_rest_hands(self):
        source = refine_b.refined_scene()
        self.assertEqual(source, refine_b.refined_scene())
        root = ET.fromstring(source)
        ids = [e.get('id') for e in root.iter() if e.get('id')]
        self.assertEqual(len(ids), len(set(ids)))
        for name in ['lin', 'awei', 'counter', 'thermos', 'visible-grip', 'lin-scene-rest', 'awei-scene-rest']:
            self.assertIn(name, ids)
        self.assertIn('给。', source)
        self.assertIn('青云小卖部', source)


if __name__ == '__main__':
    unittest.main()
