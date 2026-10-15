"""Draft decomposition guards, not production/motor acceptance."""
import unittest
import xml.etree.ElementTree as ET
import lin_parts


class PartDerivationTests(unittest.TestCase):
    def test_five_native_views_have_complete_layer_files(self):
        for view in lin_parts.VIEWS:
            d=lin_parts.draft(view)
            self.assertEqual(set(d['parts']),set(lin_parts.PARTS))
            for value in d['parts'].values():ET.fromstring(value)
            self.assertEqual(d,lin_parts.draft(view))

    def test_profile_far_limbs_exist_to_be_uncovered_by_motion(self):
        d=lin_parts.draft('side')
        self.assertEqual(set(d['occluded']),{'arm_u_l','arm_l_l','hand_l','leg_u_l','leg_l_l'})
        for name in d['occluded']:
            root=ET.fromstring(d['parts'][name])
            self.assertTrue(list(root),name)
        self.assertIn('side-near-hand',d['parts']['hand_r'])

    def test_face_overlays_are_removed_from_head_and_reusable(self):
        d=lin_parts.draft('quarter')
        self.assertNotIn('data-facial-layer',d['parts']['head'])
        self.assertEqual(set(d['faces']),{'neutral','speaking','surprise','skeptical'})
        self.assertNotEqual(d['faces']['neutral'],d['faces']['speaking'])
        back=lin_parts.draft('back')
        self.assertTrue(all(not list(ET.fromstring(v)) for v in back['faces'].values()))

    def test_nine_mouths_and_blink_layers_are_independent(self):
        for view in lin_parts.VIEWS:
            d=lin_parts.draft(view)
            self.assertEqual(set(d['mouths']),set('ABCDEFGHX'))
            self.assertEqual(set(d['eyes']),{'open','half','closed'})
            if view in ('back','quarter_back'):
                self.assertTrue(all(not list(ET.fromstring(v)) for v in d['mouths'].values()))
            else:
                self.assertEqual(len(set(d['mouths'].values())),9)
            for glyph in list(d['mouths'].values())+list(d['eyes'].values()):ET.fromstring(glyph)
            self.assertNotEqual(d['grips']['l'],d['parts']['hand_l'])
            self.assertNotEqual(d['grips']['r'],d['parts']['hand_r'])

    def test_pants_overlap_hidden_hip_region_before_bending(self):
        for view in lin_parts.VIEWS:
            d=lin_parts.draft(view)
            for side in ('l','r'):
                self.assertIn('pelvis-overlap',d['parts']['leg_u_'+side])
                self.assertLess(d['skeleton']['joints']['hip_'+side][1]-d['skeleton']['joints']['waist'][1],50)

    def test_upper_arms_overlap_the_declared_shoulder_pivot(self):
        for view in lin_parts.VIEWS:
            d=lin_parts.draft(view)
            for side in ('l','r'):
                root=ET.fromstring(d['parts']['arm_u_'+side])
                cap=next((e for e in root.iter() if e.get('data-rig-layer')=='shoulder-overlap'),None)
                self.assertIsNotNone(cap,view+'/'+side)
                self.assertEqual([float(cap.get('cx')),float(cap.get('cy'))],list(lin_parts.geometry(view)['shoulder_'+side]))
                self.assertGreaterEqual(float(cap.get('r')),9)

    def test_grip_has_distinct_thumb_and_finger_depth_layers(self):
        for view in lin_parts.VIEWS:
            for side in ('l','r'):
                glyph=lin_parts.grip_glyph(view,side)
                self.assertIn('data-grip-layer="thumb-wrap"',glyph)
                self.assertIn('data-grip-layer="finger-shadow"',glyph)
                ET.fromstring(lin_parts.svg(glyph,view))

    def test_half_blink_retains_visible_eye_white(self):
        for view in ('front','quarter','side'):
            self.assertIn('#f6edce',lin_parts.blink_glyph(view,'half'))

    def test_neutral_knee_caps_stay_inside_native_pants(self):
        for view in lin_parts.VIEWS:
            d=lin_parts.draft(view)
            for side,bounds in [('l',(111,143)),('r',(162,184))]:
                if view=='side' and side=='l':continue
                if view=='side':bounds=(148,173)
                root=ET.fromstring(d['parts']['leg_u_'+side])
                cap=next(e for e in root.iter() if e.tag.endswith('circle'))
                x,r=float(cap.get('cx')),float(cap.get('r'))
                self.assertGreaterEqual(x-r,bounds[0])
                self.assertLessEqual(x+r,bounds[1])

    def test_pivots_and_sockets_match_declared_native_geometry(self):
        for view in lin_parts.VIEWS:
            d=lin_parts.draft(view)
            sk=d['skeleton']
            self.assertEqual(sk['space'],{'width':400,'height':720})
            for side in ('l','r'):
                self.assertEqual(d['pivots']['hand_'+side],sk['joints']['hand_'+side])
                self.assertEqual(d['sockets']['hand_'+side],sk['joints']['hand_'+side])
            self.assertEqual(sk['joints']['waist'][0],sk['space']['width']/2)
            self.assertIn('waist',sk['joints'])
            self.assertGreater(sk['arm']['upper'],0)
            self.assertGreater(sk['arm']['fore'],0)


if __name__=='__main__':unittest.main()
