#!/usr/bin/env python3
"""Generate the native gymnast figure artwork for library/figure/gymnast_b.

Hand-authored vector geometry only: no raster, generated or paid source. The
figure is a compact, heavy-set adult gymnast in a sleeveless plum leotard, with
chalk-white hands and a chalk bag at the waist, drawn as one svg-bone-parts
figure with five native views. It differs from figure/athlete_a by silhouette
first and palette second, and the silhouette claims are measurements taken from
the rendered views: front silhouette 199.5 wide by 662.5 tall (ratio 0.30)
against the athlete's 178.5 by 669 (0.27), a 72-wide head against a 52-wide one
of the same height, shoulder joints 108 apart against 96, thigh capsule radius 26
against 18 and forearm radius 13 against 10.

Every lesson the athlete paid for is a construction rule here rather than a
review fix: hair fills the occiput in the two back views, shoes and hands have a
rear construction, nothing is stroked near-white, every limb buries an unstroked
socket in its parent, and both leg chains are identical (thigh 158.03, shin
160.01, ratio 0.99).

Run: python3 tools/art-direction-study/gymnast_parts.py [--stills DIR] [--view NAME]
"""
import argparse
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "library/figure/gymnast_b"
SPACE = (400, 720)
VIEWS = ("front", "quarter", "side", "back", "quarter_back")
PARTS = ("torso", "head", "arm_u_l", "arm_l_l", "hand_l", "arm_u_r", "arm_l_r", "hand_r",
         "leg_u_l", "leg_l_l", "foot_l", "leg_u_r", "leg_l_r", "foot_r")
FACES = ("calm", "shock", "fear", "desperate", "confused", "skeptical", "embarrassed",
         "relief", "excited", "proud", "somber")
MOUTHS = ("A", "B", "C", "D", "E", "F", "G", "H", "X")
HANDS = ("rest", "open", "point", "fist", "splayed")

# Palette: plum leotard, gold trim, warm mid-tan skin, near-black cropped hair.
# Plum and gold separate figure/gymnast_b from both accepted figures by hue
# (figure/athlete_a is blue and slate; figure/lin_b_draft is teal and cream) and
# the leotard is sleeveless, so bare skin carries the arms where the athlete
# carries kit.
#
# CHALK is the colour of the gymnast's hands and of the bag at the waist. It is a
# *fill* on a closed shape whose outline is INK and whose finger seams are
# CHALK_LINE, a mid tone: a near-white *stroke* is the defect the athlete shipped,
# because it is brighter than the garment, reads as a construction guide and its
# round caps hang outside the outline they were meant to sit inside.
INK = "#2b2f33"
SKIN = "#c6885b"
SKIN_SHADE = "#ad7048"
SKIN_LINE = "#8a5734"
HAIR = "#1d1a17"
HAIR_LIGHT = "#352d27"
LEOTARD = "#5b2b52"
LEOTARD_SHADE = "#42203c"
LEOTARD_LIGHT = "#7a3d6d"
GOLD = "#d9a441"
CHALK = "#f2ece0"
CHALK_SHADE = "#d6cbb7"
CHALK_LINE = "#a89a84"
SHOE = "#e9e2d4"
SHOE_SHADE = "#c9bfab"
SHOE_SOLE = "#3a3f43"
EYE_WHITE = "#f7f3e6"
PUPIL = "#26313a"
MOUTH = "#a25a4a"

# Joints: one person, mirror-symmetric about x=400/2. Thigh 158.03 and shin
# 160.01 on both sides (ratio 0.99); shoulder span 108 against the athlete's 96.
JOINTS = {
    "waist": (200.0, 338.0),
    "neck": (200.0, 186.0),
    "shoulder_l": (138.0, 208.0), "elbow_l": (128.0, 288.0), "hand_l": (118.0, 368.0),
    "shoulder_r": (262.0, 208.0), "elbow_r": (272.0, 288.0), "hand_r": (282.0, 368.0),
    "hip_l": (180.0, 354.0), "knee_l": (177.0, 512.0), "foot_l": (175.0, 672.0),
    "hip_r": (220.0, 354.0), "knee_r": (223.0, 512.0), "foot_r": (225.0, 672.0),
}

# The five views are five constructions, not one drawing compressed: each has
# its own hand-authored torso and head silhouette, and each side of a turned
# view carries its own lateral squeeze and screen shift. A far limb is narrower
# (`k`), sits closer to the body axis (its `dx` points inward) and is drawn
# behind the torso through REAR_ARMS. `near` is the side facing the camera.
# Near = "l" throughout because a figure whose left side comes toward the camera
# turns its face to screen-right, which is the direction the profile and quarter
# heads are drawn in. Limbs - arms and legs alike - are projected through this
# table, so a change here moves the legs of its view too.
SIDE_PROJECTION = {
    "front": {"l": (1.00, -2.0, 1.00), "r": (1.00, 2.0, 1.00)},
    "quarter": {"l": (1.00, -4.0, 1.00), "r": (0.70, -14.0, 0.82)},
    # A profile puts the near arm and the near leg at the same depth - the flank -
    # so one dx serves both, and both far limbs sit just behind their near twin
    # instead of spread apart. Placed at the body's outline, as before, the near arm
    # read as a second slab beside the torso and the far arm's outline crossed it.
    "side": {"l": (0.26, 12.0, 1.00), "r": (0.26, -5.0, 0.86)},
    "back": {"l": (1.00, -2.0, 1.00), "r": (1.00, 2.0, 1.00)},
    "quarter_back": {"l": (1.00, -4.0, 1.00), "r": (0.70, -14.0, 0.82)},
}
LEG_PROJECTION = {
    "front": {"l": (1.00, -1.0, 1.00), "r": (1.00, 1.0, 1.00)},
    "quarter": {"l": (1.00, -2.0, 1.00), "r": (0.74, -6.0, 0.84)},
    "side": {"l": (0.26, 9.0, 1.00), "r": (0.26, 1.0, 0.88)},
    "back": {"l": (1.00, -1.0, 1.00), "r": (1.00, 1.0, 1.00)},
    "quarter_back": {"l": (1.00, -2.0, 1.00), "r": (0.74, -6.0, 0.84)},
}
NEAR_SIDE = {"front": None, "quarter": "l", "side": "l", "back": None, "quarter_back": "l"}
# Lateral scale of a hand, per view. The profile sees a hand edge-on, so it collapses
# there; the frontal and three-quarter views keep a hand the width of a palm because
# that is the view they show. The far hand of the profile is not drawn at all, so
# only the drawn hand needs a scale.
HAND_SQUEEZE = {"front": 1.00, "quarter": 1.00, "side": 0.62, "back": 1.00,
                "quarter_back": 1.00}
# How much of a shoe's width survives the view's turn. A frontal construction keeps
# the whole sole; a quarter view foreshortens it, so the shoes turn with the body.
TURN_WIDTH = {"front": 1.0, "quarter": 0.78, "back": 1.0, "quarter_back": 0.78}
# Arms drawn behind the torso: the torso then covers the bare shoulder cap, so the
# arm grows out of the leotard's armhole instead of butting against its edge.
REAR_ARMS = {"front": ("l", "r"), "quarter": ("r",), "side": ("r",),
             "back": ("l", "r"), "quarter_back": ("r",)}


def r(n, places=2):
    return round(n, places)


def pt(x, y):
    return f"{r(x)} {r(y)}"


def svg(content):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{SPACE[0]}" height="{SPACE[1]}" '
            f'viewBox="0 0 {SPACE[0]} {SPACE[1]}"><g stroke-linecap="round" '
            f'stroke-linejoin="round">{content}</g></svg>')


def empty_svg():
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{SPACE[0]}" height="{SPACE[1]}" viewBox="0 0 {SPACE[0]} {SPACE[1]}"></svg>'


def path(d, fill="none", stroke=INK, width=1.4, extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"{extra}/>'


def filled(d, fill, stroke=INK, width=1.4, extra=""):
    return path(d, fill, stroke, width, extra)


def smooth(points, close=True):
    """Quadratic-smoothed polyline through the given points."""
    d = f"M {pt(*points[0])}"
    for i in range(1, len(points) - 1):
        cx, cy = points[i]
        nx, ny = points[i + 1]
        d += f" Q {pt(cx, cy)} {pt((cx + nx) / 2, (cy + ny) / 2)}"
    d += f" L {pt(*points[-1])}"
    return d + (" Z" if close else "")


def socket(x, y, radius, fill):
    """Unstroked joint ball: it buries the limb end inside its parent shape, so no
    background hairline can open at the attachment."""
    return circle(x, y, radius, fill, None)


def limb(a, b, ra, rb, fill, stroke=INK, width=1.5):
    """Tapered limb: a stroked tube closed by a round cap at each joint."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / length, dx / length
    left_a, left_b = (a[0] + nx * ra, a[1] + ny * ra), (b[0] + nx * rb, b[1] + ny * rb)
    right_a, right_b = (a[0] - nx * ra, a[1] - ny * ra), (b[0] - nx * rb, b[1] - ny * rb)
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    rm = (ra + rb) / 2
    d = (f"M {pt(*left_a)} Q {pt(mx + nx * rm, my + ny * rm)} {pt(*left_b)} "
         f"L {pt(*right_b)} Q {pt(mx - nx * rm, my - ny * rm)} {pt(*right_a)} Z")
    return (filled(d, fill, stroke, width) + circle(*a, ra, fill, None) +
            circle(*b, rb, fill, None))


def circle(cx, cy, radius, fill, stroke=INK, width=1.5):
    if stroke is None:
        return f'<circle cx="{r(cx)}" cy="{r(cy)}" r="{r(radius)}" fill="{fill}"/>'
    return f'<circle cx="{r(cx)}" cy="{r(cy)}" r="{r(radius)}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'


def ring(cx, cy, radius, fill, stroke=INK, width=1.4):
    return f'<ellipse cx="{r(cx)}" cy="{r(cy)}" rx="{r(radius)}" ry="{r(radius)}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'


class Frame:
    """Projects rest-space coordinates into one side of one view's drawing."""

    def __init__(self, view, side, table=SIDE_PROJECTION):
        self.view, self.side = view, side
        self.xs, self.dx, self.k = table[view][side]

    def __call__(self, p):
        return (200.0 + (p[0] - 200.0) * self.xs + self.dx, p[1])

    def j(self, name):
        return self(JOINTS[name])

    def r(self, radius):
        """A foreshortened limb is thinner than a frontal one."""
        return radius * self.k


# --------------------------------------------------------------------------- torso

# Hand-authored silhouettes, one per view: a chain of control points down each
# side from the shoulder to the hem. The near side of a turned view widens and the
# far side foreshortens toward the body axis, so the outline is asymmetric. The
# build is heavy: half-width 29 at the waist against the athlete's 24, a barrel
# front in profile, and hip joints 40 apart so the thighs meet at the crotch.
TORSO_OUTLINE = {
    "front": {"left": ((188, 188), (160, 194), (146, 216), (144, 258), (150, 304), (158, 352), (164, 398)),
              "right": ((212, 188), (240, 194), (254, 216), (256, 258), (250, 304), (242, 352), (236, 398))},
    "quarter": {"left": ((184, 186), (156, 192), (142, 214), (140, 256), (146, 302), (154, 350), (160, 396)),
                "right": ((220, 192), (238, 200), (244, 228), (244, 268), (240, 314), (234, 354), (238, 396))},
    # Profile: chest and back are separate edges, not a mirrored pair. Slice B stages
    # this view, so it has to be the same heavy body seen from the side rather than
    # the front view squeezed: the back runs thoracic curve to lumbar hollow to a
    # glute that projects behind the hip joint (167 at the seat against hips at 180),
    # and the front edge carries the pectoral, then the belly out past the chest and
    # back to the hem. Depth 72 at the chest, 68 at the belly and 73 across the seat
    # against an 84-wide frontal hip: a shade shallower than it is wide, which is what
    # stops the profile reading as a cut-out plank.
    "side": {"left": ((200, 182), (176, 196), (168, 222), (171, 252), (180, 286), (184, 312),
                       (176, 342), (167, 368), (170, 388), (182, 398)),
             "right": ((220, 182), (233, 196), (240, 222), (242, 250), (245, 278), (249, 308),
                       (241, 338), (240, 366), (234, 398))},
    "back": {"left": ((190, 192), (162, 198), (148, 220), (146, 262), (152, 308), (160, 354), (166, 398)),
             "right": ((210, 192), (238, 198), (252, 220), (254, 262), (248, 308), (240, 354), (234, 398))},
    "quarter_back": {"left": ((182, 192), (154, 198), (140, 220), (138, 262), (144, 308), (152, 352), (158, 398)),
                     "right": ((222, 196), (240, 204), (246, 232), (246, 270), (242, 314), (236, 354), (240, 398))},
}

# Leotard seams, one entry per view: (points, colour, width). Gold marks the
# armhole and the high-cut leg line, so the sleeveless cut and the leg opening are
# declared by the garment rather than inferred from where bare skin happens to
# stop. Every seam sits at least six units inboard of the outline: a stroke that
# leaves the fill is the same defect class as the near-white guide lines the
# athlete removed.
TORSO_SEAMS = {
    "front": [(((160, 200), (151, 236), (158, 272)), GOLD, 2.0),
              (((240, 200), (249, 236), (242, 272)), GOLD, 2.0),
              (((200, 214), (200, 388)), LEOTARD_SHADE, 1.2),
              (((164, 350), (184, 381), (200, 389)), GOLD, 2.2),
              (((236, 350), (216, 381), (200, 389)), GOLD, 2.2)],
    "quarter": [(((156, 198), (147, 234), (154, 270)), GOLD, 2.0),
                (((200, 210), (200, 386)), LEOTARD_SHADE, 1.2),
                (((160, 348), (184, 379), (200, 387)), GOLD, 2.2),
                (((234, 350), (218, 379), (200, 387)), GOLD, 1.8)],
    "side": [(((188, 198), (183, 236), (190, 268)), GOLD, 2.0),
             (((200, 208), (200, 384)), LEOTARD_SHADE, 1.2),
             (((230, 348), (216, 378), (200, 386)), GOLD, 2.2),
             # Lumbar hollow and the fold under the seat, both kept inboard of the
             # new back edge so the shading still reads as shading.
             (((197, 330), (191, 306), (198, 284)), LEOTARD_SHADE, 1.2),
             (((182, 336), (172, 362), (179, 388)), LEOTARD_SHADE, 1.2)],
    "back": [(((162, 204), (153, 240), (160, 276)), GOLD, 2.0),
             (((238, 204), (247, 240), (240, 276)), GOLD, 2.0),
             (((200, 216), (200, 388)), LEOTARD_SHADE, 1.2),
             (((178, 246), (190, 280), (186, 316)), LEOTARD_SHADE, 1.2),
             (((222, 246), (210, 280), (214, 316)), LEOTARD_SHADE, 1.2),
             (((166, 352), (184, 383), (200, 391)), GOLD, 2.2),
             (((234, 352), (216, 383), (200, 391)), GOLD, 2.2)],
    "quarter_back": [(((154, 206), (145, 242), (152, 278)), GOLD, 2.0),
                     (((200, 214), (200, 386)), LEOTARD_SHADE, 1.2),
                     (((176, 250), (188, 284), (184, 318)), LEOTARD_SHADE, 1.2),
                     (((158, 350), (180, 381), (200, 389)), GOLD, 2.2),
                     (((236, 352), (218, 381), (200, 389)), GOLD, 1.8)],
}

# The chalk bag hangs on the gymnast's left hip, so it is on the near side of both
# quarter views and it silhouettes out of the profile. The offset is measured from
# the projected hip joint, and the squash is the same lateral foreshortening the
# far limbs get. It is held off the hanging hand by at least six units, which is
# what keeps the gap between arm and torso open to the canvas instead of sealing
# it into an enclosed hole.
BAG_TURN = {"front": (-9.0, 44.0, 1.00), "quarter": (-9.0, 44.0, 0.88),
            "side": (-24.0, 46.0, 0.60), "back": (-11.0, 44.0, 1.00),
            "quarter_back": (-9.0, 44.0, 0.88)}


def silhouette(left, right):
    loop = [*left, right[-1], *reversed(right[:-1])]
    return smooth(loop)


def seam(points, colour, width):
    return path(smooth(points, close=False), "none", colour, width)


def chalk_bag(fr):
    """A chalk bag at the waist, drawn as part of the torso.

    It overlaps the hip by design: a bag attached by a thin strap would enclose a
    background wedge between strap and pouch, which is a silhouette hole. A belt
    tab buried under the pouch top and the pouch buried in the leotard keep the
    whole construction one closed shape.
    """
    v = fr.view
    hip = fr.j("hip_l")
    bx, by, sx = BAG_TURN[v]
    cx, cy = hip[0] + bx, hip[1] + by
    w, h = 26.0 * sx, 29.0
    top = cy - h
    nodes = [filled(f"M {pt(cx - w * 0.9, top + 4)} L {pt(cx + w * 0.9, top + 4)} "
                    f"L {pt(cx + w * 0.9, top - 9)} L {pt(cx - w * 0.9, top - 9)} Z",
                    LEOTARD_SHADE, INK, 1.0),
             filled(f"M {pt(cx - w * 0.78, top + 5)} Q {pt(cx, top - 7)} {pt(cx + w * 0.78, top + 5)} "
                    f"Q {pt(cx + w * 1.12, cy + h * 0.45)} {pt(cx + w * 0.74, cy + h)} "
                    f"Q {pt(cx, cy + h * 1.2)} {pt(cx - w * 0.74, cy + h)} "
                    f"Q {pt(cx - w * 1.12, cy + h * 0.45)} {pt(cx - w * 0.78, top + 5)} Z",
                    CHALK_SHADE, INK, 1.8),
             filled(f"M {pt(cx - w * 0.78, top + 5)} Q {pt(cx, top - 7)} {pt(cx + w * 0.78, top + 5)} "
                    f"Q {pt(cx, top + 13)} {pt(cx - w * 0.78, top + 5)} Z", CHALK, INK, 1.2)]
    if v in ("back", "quarter_back"):
        # Seen from behind the bag shows its plain back panel and a centre seam,
        # not the drawstring knot and flap the front carries.
        nodes.append(path(f"M {pt(cx, top + 12)} L {pt(cx, cy + h * 0.86)}", "none", CHALK_LINE, 1.2))
    else:
        nodes.append(path(f"M {pt(cx - w * 0.5, top + 16)} Q {pt(cx, top + 24)} {pt(cx + w * 0.5, top + 16)}",
                          "none", CHALK_LINE, 1.4))
        nodes.append(path(f"M {pt(cx - w * 0.28, top + 20)} Q {pt(cx, top + 34)} {pt(cx - w * 0.1, top + 40)}",
                          "none", GOLD, 1.2))
    return nodes


def torso(fr):
    v = fr.view
    left, right = TORSO_OUTLINE[v]["left"], TORSO_OUTLINE[v]["right"]
    nodes = [filled(silhouette(left, right), LEOTARD, INK, 2.0)]
    nodes += [seam(points, colour, width) for points, colour, width in TORSO_SEAMS[v]]
    return nodes + chalk_bag(fr)


# ---------------------------------------------------------------------------- head

# A broad adult face: cheeks wider than the temples, a heavy jaw and a short neck
# (the collar covers the neck's foot, so only about fourteen units of neck show).
FRONT_FACE = ((204, 58), (228, 86), (236, 116), (230, 148), (212, 172),
              (188, 172), (170, 148), (164, 116), (172, 86), (196, 58))

# The profile contour: crown, forehead, brow ridge, nasal root, nose bridge, tip,
# under-nose, philtrum, upper lip, mouth corner, lower lip, chin, jaw, and back round
# the occiput. One closed shape, so brow to chin reads as one edge.
PROFILE_FACE = ((198, 50), (214, 58), (224, 74), (230, 88), (226, 96), (232, 112),
                (239, 125), (232, 131), (229, 137), (233, 142), (229, 147), (232, 152),
                (224, 159), (226, 166), (214, 175), (197, 179), (181, 172), (172, 150),
                (166, 120), (171, 90), (182, 62))


def collar(cx):
    """Leotard yoke over the neck's foot, with its own gold edge, so the short neck
    meets the garment in a curve instead of a hard step where two shapes cross."""
    return (filled(f"M {pt(cx - 22, 188)} Q {pt(cx, 202)} {pt(cx + 22, 188)} L {pt(cx + 23, 212)} "
                   f"Q {pt(cx, 220)} {pt(cx - 23, 212)} Z", LEOTARD, INK, 1.4) +
            path(smooth(((cx - 20, 200), (cx, 209), (cx + 20, 200)), close=False), "none", GOLD, 1.6))


def head(fr):
    v = fr.view
    if v != "side":
        shift = {"front": 0.0, "back": 0.0, "quarter": 5.0, "quarter_back": -5.0}[v]
        squeeze = 1.0 if v in ("front", "back") else 0.9
        face_pts = tuple((200 + (p[0] - 200) * squeeze + shift, p[1]) for p in FRONT_FACE)
        cx = 200 + shift
        # Short thick neck, buried in both the jaw and the yoke.
        neck = [filled(f"M {pt(cx - 14, 146)} L {pt(cx + 14, 146)} L {pt(cx + 16, 204)} "
                       f"L {pt(cx - 16, 204)} Z", SKIN_SHADE, INK, 1.4), collar(cx)]
        nodes = neck + [filled(smooth(face_pts), SKIN, INK, 2.0)]
        # Near-side features only on a turned head: the far ear has gone round the
        # back of the skull, and a back view shows no ear at all.
        if v == "front":
            nodes += [ring(cx - 31, 118, 6.2, SKIN_SHADE, INK, 1.2),
                      ring(cx + 31, 118, 6.2, SKIN_SHADE, INK, 1.2)]
        elif v == "quarter":
            nodes += [ring(cx - 31, 118, 6.2, SKIN_SHADE, INK, 1.2)]
        if v in ("front", "quarter"):
            # Short athletic crop. The outer contour passes a few units outside the
            # skull and the hairline sits well inside the face, so hair and face
            # always overlap: a hairline that runs above the face's own edge leaves a
            # band of background between two closed shapes, which is an enclosed hole.
            nodes += [filled(f"M {pt(cx - 34, 130)} Q {pt(cx - 41, 72)} {pt(cx - 18, 54)} "
                             f"Q {pt(cx + 4, 42)} {pt(cx + 27, 52)} Q {pt(cx + 40, 72)} "
                             f"{pt(cx + 36, 118)} Q {pt(cx + 30, 100)} {pt(cx + 24, 88)} "
                             f"Q {pt(cx + 4, 80)} {pt(cx - 17, 88)} "
                             f"Q {pt(cx - 29, 106)} {pt(cx - 34, 130)} Z", HAIR, INK, 1.8),
                      filled(f"M {pt(cx - 2, 50)} Q {pt(cx + 20, 40)} {pt(cx + 36, 64)} "
                             f"L {pt(cx + 18, 54)} Q {pt(cx + 4, 47)} {pt(cx - 2, 56)} Z",
                             HAIR_LIGHT, HAIR_LIGHT, 0.6),
                      filled(f"M {pt(cx - 27, 100)} L {pt(cx - 21, 96)} L {pt(cx - 22, 132)} "
                             f"L {pt(cx - 27, 128)} Z", HAIR, INK, 1.0)]
            if v == "front":
                nodes += [filled(f"M {pt(cx + 27, 100)} L {pt(cx + 21, 96)} L {pt(cx + 22, 132)} "
                                 f"L {pt(cx + 27, 128)} Z", HAIR, INK, 1.0)]
        else:
            # Back of the head: the hair IS the outer shape from the crown to the
            # nape, following the skull outline a little outside it and turning into
            # a short nape curve the neck rises into. Drawn as a crown-only crescent
            # it left the occiput a bare skin oval, and the figure read as bald from
            # behind - the athlete's first back view.
            nodes += [filled(f"M {pt(cx - 34, 118)} Q {pt(cx - 37, 56)} {pt(cx - 2, 46)} "
                             f"Q {pt(cx + 32, 46)} {pt(cx + 34, 82)} Q {pt(cx + 35, 106)} "
                             f"{pt(cx + 33, 124)} Q {pt(cx + 27, 148)} {pt(cx + 15, 166)} "
                             f"Q {pt(cx + 8, 176)} {pt(cx, 177)} Q {pt(cx - 8, 176)} "
                             f"{pt(cx - 15, 166)} Q {pt(cx - 27, 148)} {pt(cx - 33, 124)} Z",
                             HAIR, INK, 1.8),
                      path(f"M {pt(cx - 8, 62)} Q {pt(cx + 10, 66)} {pt(cx + 18, 92)}", "none",
                           HAIR_LIGHT, 1.6),
                      path(f"M {pt(cx - 18, 150)} Q {pt(cx, 158)} {pt(cx + 18, 150)}", "none",
                           HAIR_LIGHT, 1.4)]
        if v == "quarter_back":
            # The sliver of near cheek and ear turned toward the camera has to sit in
            # front of the hair, not on bare skin.
            nodes += [filled(f"M {pt(cx - 33, 104)} Q {pt(cx - 39, 124)} {pt(cx - 33, 146)} "
                             f"L {pt(cx - 25, 140)} Q {pt(cx - 28, 122)} {pt(cx - 27, 106)} Z",
                             SKIN, INK, 1.0),
                      ring(cx - 30, 120, 6.0, SKIN_SHADE, INK, 1.2)]
        return nodes
    # Profile: faces screen-right, drawn around the same neck pivot.
    neck = [filled(f"M {pt(190, 146)} L {pt(216, 146)} L {pt(218, 204)} L {pt(188, 204)} Z",
                   SKIN_SHADE, INK, 1.4),
            filled(f"M {pt(184, 188)} Q {pt(204, 200)} {pt(224, 190)} L {pt(225, 212)} "
                   f"Q {pt(204, 220)} {pt(183, 212)} Z", LEOTARD, INK, 1.4),
            path(smooth(((188, 198), (204, 208), (221, 199)), close=False), "none", GOLD, 1.6)]
    # Brow, nose, lips and chin are points of ONE contour: a profile nose drawn as a
    # mark on a smooth oval, with the eyes stacked on the outline, is the malformation
    # this replaces. Every feature the face art adds - eye, brow, nostril, mouth - has
    # its anchor inside this contour (see FACE_ANCHOR["side"]).
    profile = [filled(smooth(PROFILE_FACE), SKIN, INK, 2.0),
               # Heavy jaw: one short curve under the chin, so the profile reads as a
               # thick-set adult rather than a taper.
               path(f"M {pt(215, 168)} Q {pt(205, 177)} {pt(194, 174)}", "none", SKIN_LINE, 1.0)]
    # Short athletic crop: the outer edge passes outside the skull from the hairline
    # round the occiput to the nape, and the hairline itself crosses the face, so hair
    # and face always overlap and the skull is never left bare from this side.
    hair = [filled(smooth(((219, 72), (224, 52), (206, 40), (180, 44), (167, 74),
                           (166, 112), (177, 148), (190, 164), (194, 150),
                           (196, 128), (200, 106), (208, 88))),
                   HAIR, INK, 1.8),
            # Sheen inside the mass, never across its edge: a light strand laid over
            # the hairline reads as a lock hanging on the forehead.
            path(f"M {pt(180, 66)} Q {pt(196, 50)} {pt(214, 60)}", "none", HAIR_LIGHT, 1.6),
            path(f"M {pt(172, 104)} Q {pt(186, 96)} {pt(196, 104)}", "none", HAIR_LIGHT, 1.4)]
    # The ear is part of the profile, not a mark on the cheek: it is drawn over the
    # hair's edge with its own curve, sitting on the skull between jaw and occiput.
    ear = [filled(f"M {pt(181, 148)} Q {pt(178, 124)} {pt(188, 114)} Q {pt(198, 110)} "
                  f"{pt(203, 122)} Q {pt(206, 136)} {pt(197, 147)} Q {pt(188, 153)} "
                  f"{pt(181, 148)} Z", SKIN_SHADE, INK, 1.0),
           path(f"M {pt(188, 122)} Q {pt(195, 131)} {pt(189, 142)}", "none", SKIN_LINE, 0.9)]
    return neck + profile + hair + ear


# ---------------------------------------------------------------------------- arms

def arm_parts(fr, side):
    """Bare arm out of a sleeveless armhole, ending in a chalk cuff at the wrist.

    The leotard is sleeveless, so there is no sleeve to hand the attachment to: the
    bare shoulder cap is an unstroked skin socket buried in the torso, and the elbow
    is buried the same way by the forearm's socket. A limb that abuts its parent
    instead of overlapping it leaves a background hairline at the junction.
    """
    shoulder = fr.j(f"shoulder_{side}")
    elbow = fr.j(f"elbow_{side}")
    hand = fr.j(f"hand_{side}")
    r_shoulder, r_arm = fr.r(17.5), fr.r(14.5)
    r_fore, r_wrist = fr.r(13.0), fr.r(9.0)
    band = (elbow[0] + (hand[0] - elbow[0]) * 0.80, elbow[1] + (hand[1] - elbow[1]) * 0.80)
    band_end = (elbow[0] + (hand[0] - elbow[0]) * 0.95, elbow[1] + (hand[1] - elbow[1]) * 0.95)
    deltoid = (shoulder[0] + (elbow[0] - shoulder[0]) * 0.34,
               shoulder[1] + (elbow[1] - shoulder[1]) * 0.34)
    upper = [socket(shoulder[0], shoulder[1], r_shoulder, SKIN),
             limb(shoulder, elbow, r_shoulder, r_arm, SKIN, INK, 1.6),
             # One shading arc on the deltoid, inboard of the outline: a line down
             # the middle of a limb reads as a construction mark, not as the limb.
             path(f"M {pt(deltoid[0] - 4, deltoid[1] - 12)} Q {pt(deltoid[0] + 2, deltoid[1])} "
                  f"{pt(deltoid[0] - 5, deltoid[1] + 10)}", "none", SKIN_SHADE, 1.2)]
    forearm = [socket(elbow[0], elbow[1], r_arm + 1.2, SKIN),
               limb(elbow, band, r_fore, r_wrist * 1.12, SKIN, INK, 1.4),
               # Chalk cuff: white chalk on the wrist, drawn as a fill inside its own
               # ink edge. Never a near-white stroke - that is a debug guide.
               limb(band, band_end, r_wrist * 1.14, r_wrist * 1.04, CHALK, INK, 1.0)]
    return upper, forearm


# ---------------------------------------------------------------------------- legs

def leg_parts(fr, side):
    """Bare thick leg out of a leotard leg opening, down to a soft gym shoe.

    A far leg of a turned view is narrower, sits behind the near leg and is drawn
    without its own outline, so its silhouette cannot cut a seam across the near
    leg. Unstroked sockets at the hip and knee keep every join closed.
    """
    hip = fr.j(f"hip_{side}")
    knee = fr.j(f"knee_{side}")
    foot = fr.j(f"foot_{side}")
    far = NEAR_SIDE[fr.view] is not None and side != NEAR_SIDE[fr.view]
    fill = SKIN_SHADE if far else SKIN
    edge = fill if far else INK
    shade = fill if far else SKIN_SHADE
    r_hip, r_knee, r_ankle = fr.r(26.0), fr.r(19.0), fr.r(11.0)
    thigh = [socket(hip[0], hip[1] - 22, fr.r(27.0), LEOTARD if not far else LEOTARD_SHADE),
             limb((hip[0], hip[1] - 16), knee, r_hip, r_knee, fill, edge, 1.7),
             path(f"M {pt(hip[0] + (2 if side == 'l' else -2), knee[1] - 44)} "
                  f"Q {pt(knee[0] + (5 if side == 'l' else -5), knee[1] - 18)} "
                  f"{pt(knee[0] + (4 if side == 'l' else -4), knee[1] - 4)}",
                  "none", shade, 1.2)]
    ankle = (foot[0], foot[1] - 14)
    shin = [socket(knee[0], knee[1], r_knee + 2.0, fill),
            limb(knee, ankle, r_knee * 0.98, r_ankle, fill, edge, 1.7),
            limb((foot[0], foot[1] - 30), ankle, r_ankle * 1.1, r_ankle * 1.02, fill, edge, 1.4)]
    return thigh, shin


def foot_part(fr, side):
    x, y = fr.j(f"foot_{side}")
    far = NEAR_SIDE[fr.view] is not None and side != NEAR_SIDE[fr.view]
    if fr.view == "side":
        x += 3 if not far else -7
        sole = SHOE_SOLE if not far else LEOTARD_SHADE
        body = SHOE if not far else SHOE_SHADE
        edge = INK if not far else SHOE_SHADE
        return [filled(f"M {pt(x - 14, y - 12)} Q {pt(x + 6, y - 16)} {pt(x + 15, y - 4)} "
                       f"L {pt(x + 32, y + 18)} Q {pt(x + 37, y + 32)} {pt(x + 22, y + 40)} "
                       f"Q {pt(x - 6, y + 44)} {pt(x - 14, y + 38)} "
                       f"Q {pt(x - 20, y + 14)} {pt(x - 14, y - 12)} Z",
                       body, edge, 1.8),
                filled(f"M {pt(x - 16, y + 2)} L {pt(x + 4, y + 2)} L {pt(x + 10, y + 12)} "
                       f"L {pt(x - 17, y + 12)} Z", LEOTARD, LEOTARD_SHADE, 1.0),
                path(f"M {pt(x - 18, y + 30)} Q {pt(x - 2, y + 32)} {pt(x + 12, y + 32)}",
                     "none", SHOE_SHADE, 1.6),
                filled(f"M {pt(x - 19, y + 32)} L {pt(x + 12, y + 32)} Q {pt(x + 28, y + 34)} "
                       f"{pt(x + 22, y + 43)} L {pt(x - 16, y + 43)} Q {pt(x - 20, y + 38)} "
                       f"{pt(x - 19, y + 32)} Z", sole, sole, 0.0)]
    toe = -5.0 if side == "l" else 5.0
    body = SHOE if not far else SHOE_SHADE
    edge = INK if not far else SHOE_SHADE
    sole = SHOE_SOLE if not far else LEOTARD_SHADE
    # A foot belongs to its leg, so it turns with the body: the quarter views
    # foreshorten the shoe across the screen instead of copying the front one.
    turn = TURN_WIDTH[fr.view] * fr.k
    ox = lambda offset: x + offset * turn
    if fr.view in ("back", "quarter_back"):
        # Seen from behind the toes have turned away: the shoe is a heel. No toe box
        # and no strap across the instep - a counter seam wrapping a centre stitch
        # over the sole is what distinguishes it from the same shoe from the front.
        return [socket(x, y - 8, fr.r(16.0) * turn, body),
                filled(f"M {pt(ox(-16), y - 4)} Q {pt(x, y - 14)} {pt(ox(16), y - 4)} "
                       f"Q {pt(ox(19), y + 12)} {pt(ox(18), y + 29)} "
                       f"Q {pt(x, y + 35)} {pt(ox(-18), y + 29)} "
                       f"Q {pt(ox(-19), y + 12)} {pt(ox(-16), y - 4)} Z", body, edge, 1.8),
                path(f"M {pt(x, y + 2)} L {pt(x, y + 28)}", "none", SHOE_SHADE, 1.1),
                path(f"M {pt(ox(-14), y + 19)} Q {pt(ox(-15), y + 5)} {pt(ox(-5), y + 1)}",
                     "none", SHOE_SHADE, 1.3),
                path(f"M {pt(ox(14), y + 19)} Q {pt(ox(15), y + 5)} {pt(ox(5), y + 1)}",
                     "none", SHOE_SHADE, 1.3),
                filled(f"M {pt(ox(-19), y + 28)} Q {pt(x, y + 34)} {pt(ox(19), y + 28)} "
                       f"L {pt(ox(18), y + 34)} Q {pt(x, y + 43)} {pt(ox(-18), y + 34)} Z",
                       sole, sole, 0.0)]
    nodes = [socket(x, y - 8, fr.r(16.0) * turn, body),
             filled(f"M {pt(ox(-17), y - 10)} Q {pt(x, y - 18)} {pt(ox(17), y - 10)} "
                    f"Q {pt(ox(20), y + 10)} {pt(ox(18 + toe * 0.5), y + 31)} "
                    f"Q {pt(ox(toe), y + 40)} {pt(ox(-18 + toe * 0.5), y + 31)} "
                    f"Q {pt(ox(-20), y + 10)} {pt(ox(-17), y - 10)} Z", body, edge, 1.8)]
    # Front construction: an instep strap in the leotard colour and its gold edge,
    # which is the mark a heel view does not carry.
    nodes += [filled(f"M {pt(ox(-13), y + 4)} L {pt(ox(13), y + 4)} L {pt(ox(11), y + 12)} "
                     f"L {pt(ox(-11), y + 12)} Z", LEOTARD, LEOTARD_SHADE, 1.0),
              path(f"M {pt(ox(-12), y + 9)} L {pt(ox(12), y + 9)}", "none", GOLD, 1.4),
              filled(f"M {pt(ox(-19), y + 27)} Q {pt(ox(toe * 0.5), y + 34)} "
                     f"{pt(ox(19 + toe * 0.5), y + 27)} "
                     f"L {pt(ox(18 + toe * 0.5), y + 33)} Q {pt(ox(toe * 0.5), y + 42)} "
                     f"{pt(ox(-18 + toe * 0.5), y + 33)} Z", sole, sole, 0.0)]
    return nodes


# --------------------------------------------------------------------------- hands

def _palm():
    return "M -10 -8 Q 0 -11 10 -8 Q 13 4 12 18 L -12 18 Q -13 4 -10 -8 Z"


def hand_shape(shape, mirror, back=False):
    """One chalked hand, palm or back. Which side the thumb sits on is the whole
    difference between the two, so a back-facing view flips the thumb and the fist
    crease across the hand's own axis and leaves the fingers where they are.

    The fill is chalk white, so the hand has to be given its form by the ink outline
    and by CHALK_LINE finger seams rather than by value: an unoutlined white shape at
    this size reads as a block, and fingers that share a near-white edge disappear.
    """
    flip = -1.0 if back else 1.0
    nodes = [filled(_palm(), CHALK, INK, 1.2),
             filled("M -10 8 Q 0 14 10 8 L 12 18 L -12 18 Z", CHALK_SHADE, CHALK_SHADE, 0.0)]
    curl, length = {"rest": (0.55, 16), "open": (0.0, 28), "point": (0.0, 27), "fist": (1.0, 8),
                    "splayed": (-0.18, 27)}[shape]
    xs = (-8.0, -2.8, 2.8, 8.0)
    for i, fx in enumerate(xs):
        h = length - (abs(i - 1) * 1.8 if shape == "splayed" else 0.0)
        if shape == "point" and i != 1:
            h = 8
        if shape == "fist":
            nodes.append(filled(f"M {pt(fx - 2.6, 15)} L {pt(fx + 2.6, 15)} L {pt(fx + 2.6, 25)} "
                                f"Q {pt(fx, 29)} {pt(fx - 2.6, 25)} Z", CHALK, CHALK_LINE, 0.8))
            continue
        spread = 0.0 if shape != "splayed" else (i - 1.5) * 5.0
        nodes.append(filled(f"M {pt(fx - 2.7, 14)} L {pt(fx + 2.7, 14)} "
                            f"L {pt(fx + 2.5 + spread, 13 + h)} Q {pt(fx + spread, 18 + h)} "
                            f"{pt(fx - 2.5 + spread, 13 + h)} Z", CHALK, CHALK_LINE, 0.8))
    thumb = (f"M {pt(-10 * flip, 0)} Q {pt(-18 * flip, 6)} {pt(-16 * flip, 14)} "
             f"Q {pt(-14 * flip, 20)} {pt(-9 * flip, 17)} Z")
    nodes.append(filled(thumb, CHALK, CHALK_LINE, 1.0))
    if shape == "fist":
        nodes.append(path(f"M {pt(-13 * flip, 4)} Q {pt(-4 * flip, 12)} {pt(5 * flip, 10)}",
                          "none", CHALK_LINE, 1.1))
    if mirror:
        return [n.replace("<path", '<path data-mirror="1"') for n in nodes]
    return nodes


def hands(fr, side):
    x, y = fr.j(f"hand_{side}")
    mirror = side == "l"
    back = fr.view in ("back", "quarter_back")
    # In profile the far hand hangs directly behind the body: the torso covers all of
    # it but the fingertips, and the near arm does not reach that far back, so it was
    # drawn as a second mitten on the leotard. It is not drawn at all.
    hidden = fr.view == "side" and side != NEAR_SIDE[fr.view]
    if hidden:
        return {shape: empty_svg() for shape in HANDS}
    parts = {}
    for shape in HANDS:
        nodes = hand_shape(shape, mirror, back)
        inner = "".join(nodes)
        sx = (-1.25 if mirror else 1.25) * HAND_SQUEEZE[fr.view]
        parts[shape] = svg(f'<g transform="translate({r(x)} {r(y)}) scale({sx} 1.25)" '
                           f'data-kind="hand">{inner}</g>')
    return parts


# ---------------------------------------------------------------------------- face

FACE_ANCHOR = {
    "front": dict(cx=200.0, ex=15.6, ew=1.08, eye=116.0, brow=102.0, mouth=150.0, mw=1.08, skew=0.0),
    "quarter": dict(cx=204.0, ex=14.0, ew=0.94, eye=116.0, brow=102.0, mouth=150.0, mw=0.94, skew=3.0),
    # The profile shows one eye, one brow and a nostril on the contour it already
    # draws: two eyes stacked at the edge of a face is what made the side view's head
    # unreadable. Skew shifts the mouth to the lip edge rather than the face centre.
    "side": dict(cx=217.0, ex=0.0, ew=0.56, eye=112.0, brow=96.0, mouth=145.0, mw=0.58,
                 skew=11.6, sides=("r",), nostril=(234.0, 129.0)),
}
# Every view but the profile shows both eyes and both brows.
FACE_SIDES = ("l", "r")


def eye_open(a, side):
    cx = a["cx"] + (a["ex"] if side == "r" else -a["ex"])
    w = 8.0 * a["ew"]
    h = 5.6
    cy = a["eye"]
    return (filled(f"M {pt(cx - w, cy)} Q {pt(cx, cy - h) } {pt(cx + w, cy)} "
                   f"Q {pt(cx, cy + h * 0.72)} {pt(cx - w, cy)} Z", EYE_WHITE, INK, 1.2,
                   ' data-face-role="eye"') +
            f'<ellipse cx="{r(cx + (1.0 if side == "r" else -1.0))}" cy="{r(cy)}" rx="{r(2.6 * a["ew"] + 0.6)}" '
            f'ry="3.1" fill="{PUPIL}" data-face-role="eye" data-gaze-pupil="1"/>')


def eye_half(a, side):
    cx = a["cx"] + (a["ex"] if side == "r" else -a["ex"])
    w = 8.0 * a["ew"]
    cy = a["eye"]
    return path(f"M {pt(cx - w, cy - 1)} Q {pt(cx, cy + 5)} {pt(cx + w, cy - 1)}", "none", INK, 2.0)


def eye_closed(a, side):
    cx = a["cx"] + (a["ex"] if side == "r" else -a["ex"])
    w = 8.0 * a["ew"]
    cy = a["eye"]
    return path(f"M {pt(cx - w, cy + 1)} Q {pt(cx, cy - 3.4)} {pt(cx + w, cy + 1)}", "none", INK, 2.0)


def brow(a, side, lift=0.0, angle=0.0):
    cx = a["cx"] + (a["ex"] * 1.05 if side == "r" else -a["ex"] * 1.05)
    cy = a["brow"] - lift
    w = 8.4 * a["ew"]
    tilt = angle if side == "r" else -angle
    inner_x = cx - w if side == "r" else cx + w
    outer_x = cx + w if side == "r" else cx - w
    index = 0 if side == "r" else 1
    return path(f"M {pt(inner_x, cy + tilt)} Q {pt(cx, cy - 2.4)} {pt(outer_x, cy - tilt * 0.4)}",
                "none", HAIR, 2.6, f' data-face-role="brow" data-brow-index="{index}"')


def nose(a):
    """The nose itself belongs to the profile's contour; a frontal face needs the mark,
    a profile needs only the nostril under the tip."""
    if "nostril" in a:
        nx, ny = a["nostril"]
        return path(f"M {pt(nx - 3.0, ny)} Q {pt(nx + 0.6, ny + 2.6)} {pt(nx + 3.0, ny - 0.6)}",
                    "none", SKIN_LINE, 1.3)
    x = a["cx"] + a["skew"]
    return path(f"M {pt(x - 2.4, a['eye'] + 8)} Q {pt(x + 1.6, a['eye'] + 13)} {pt(x - 2.0, a['eye'] + 15)}",
                "none", SKIN_LINE, 1.4)


def mouth_shape(a, key, width_scale=1.0, open_scale=1.0):
    x, y = a["cx"] + a["skew"] * 0.5, a["mouth"]
    w = 9.0 * a["mw"] * width_scale
    h = 5.4 * open_scale
    shapes = {
        "A": ("closed", 0.0), "B": ("open", 0.35), "C": ("open", 0.62), "D": ("open", 1.0),
        "E": ("round", 0.7), "F": ("round", 0.4), "G": ("wide", 0.3), "H": ("small", 0.5),
        "X": ("closed", 0.0),
    }
    kind, amount = shapes.get(key, ("open", 0.5 * open_scale))
    if kind == "closed":
        return path(f"M {pt(x - w, y)} Q {pt(x, y + 2.6)} {pt(x + w, y)}", "none", SKIN_LINE, 1.8)
    if kind == "wide":
        return filled(f"M {pt(x - w, y - 1)} Q {pt(x, y + h * 1.2)} {pt(x + w, y - 1)} "
                      f"Q {pt(x, y + h * 0.2)} {pt(x - w, y - 1)} Z", MOUTH, INK, 1.3)
    if kind == "round":
        return f'<ellipse cx="{r(x)}" cy="{r(y + 1)}" rx="{r(w * 0.5 * amount + 1.6)}" ' \
               f'ry="{r(h * amount + 1.4)}" fill="{MOUTH}" stroke="{INK}" stroke-width="1.3"/>'
    if kind == "small":
        return filled(f"M {pt(x - w * 0.5, y)} Q {pt(x, y + h * amount)} {pt(x + w * 0.5, y)} "
                      f"Q {pt(x, y - 1.2)} {pt(x - w * 0.5, y)} Z", MOUTH, INK, 1.2)
    return filled(f"M {pt(x - w, y - 1)} Q {pt(x, y + h * amount * 2.2)} {pt(x + w, y - 1)} "
                  f"Q {pt(x, y + h * 0.1)} {pt(x - w, y - 1)} Z", MOUTH, INK, 1.3)


def expression(a, family):
    """Open eyes, brows and one family-specific ink pass."""
    profile = {
        "calm": (0.0, 0.0, 0.0), "shock": (5.0, 0.0, 0.0), "fear": (3.0, 3.4, 0.0),
        "desperate": (2.0, -2.0, 0.0), "confused": (0.6, 2.6, 0.0), "skeptical": (-1.0, 3.6, 0.0),
        "embarrassed": (-2.0, -1.6, 0.0), "relief": (-1.6, -0.6, 0.0), "excited": (1.6, -2.2, 0.0),
        "proud": (1.0, -1.0, 0.0), "somber": (-1.4, 1.6, 0.0),
    }[family]
    lift, angle, _ = profile
    sides = a.get("sides", FACE_SIDES)
    nodes = [eye_open(a, side) for side in sides] + [nose(a)]
    nodes += [brow(a, side, max(lift, 0.0), angle) for side in sides]
    if family == "shock":
        nodes.append(f'<ellipse cx="{r(a["cx"])}" cy="{r(a["mouth"])}" rx="4.2" ry="5.0" '
                     f'fill="none" stroke="{INK}" stroke-width="1.2"/>')
    if family == "skeptical":
        nodes.append(path(f"M {pt(a['cx'] - 12 * a['ew'], a['eye'] + 16)} "
                          f"L {pt(a['cx'] - 4 * a['ew'], a['eye'] + 14)}", "none", SKIN_LINE, 1.4))
    if family == "embarrassed":
        nodes.append(f'<ellipse cx="{r(a["cx"] - 13 * a["ew"])}" cy="{r(a["eye"] + 20)}" rx="4.4" ry="2.6" '
                     f'fill="#d98a72" opacity=".55" data-face-role="eye"/>')
        nodes.append(f'<ellipse cx="{r(a["cx"] + 13 * a["ew"])}" cy="{r(a["eye"] + 20)}" rx="4.4" ry="2.6" '
                     f'fill="#d98a72" opacity=".55" data-face-role="eye"/>')
    if family in ("fear", "desperate"):
        nodes.append(path(f"M {pt(a['cx'] + 16 * a['ew'], a['eye'] - 6)} Q {pt(a['cx'] + 22 * a['ew'], a['eye'] + 2)} "
                          f"{pt(a['cx'] + 16 * a['ew'], a['eye'] + 10)} Q {pt(a['cx'] + 11 * a['ew'], a['eye'] + 2)} "
                          f"{pt(a['cx'] + 16 * a['ew'], a['eye'] - 6)} Z", "#8fd0e8", "#4a86a3", 1.0))
    if family == "proud":
        nodes.append(path(f"M {pt(a['cx'] - 5, a['eye'] + 24)} Q {pt(a['cx'], a['eye'] + 27)} "
                          f"{pt(a['cx'] + 5, a['eye'] + 24)}", "none", SKIN_LINE, 1.2))
    return svg("".join(nodes))


def emotion_mouth(a, family):
    shape = {"calm": ("A", 1.0, 1.0), "shock": ("D", 0.8, 1.1), "fear": ("C", 0.9, 0.9),
             "desperate": ("C", 1.1, 1.2), "confused": ("B", 0.9, 0.7), "skeptical": ("A", 0.95, 1.0),
             "embarrassed": ("B", 0.8, 0.6), "relief": ("B", 0.9, 0.8), "excited": ("G", 1.15, 1.4),
             "proud": ("A", 1.05, 1.1), "somber": ("A", 0.85, 0.9)}[family]
    return svg(mouth_shape(a, shape[0], shape[1], shape[2]))


def viseme_mouth(a, key):
    return svg(mouth_shape(a, key, 1.0, 1.0))


def tears(a):
    nodes = []
    for side in a.get("sides", FACE_SIDES):
        cx = a["cx"] + (a["ex"] if side == "r" else -a["ex"])
        cy = a["eye"] + 8
        nodes.append(path(f"M {pt(cx - 2.4, cy)} Q {pt(cx, cy + 7)} {pt(cx + 2.4, cy)} "
                          f"Q {pt(cx, cy + 1.6)} {pt(cx - 2.4, cy)} Z", "#8fd0e8", "#4a86a3", 0.9))
        nodes.append(path(f"M {pt(cx, cy + 10)} L {pt(cx, cy + 18)}", "none", "#8fd0e8", 1.6))
    return svg("".join(nodes))


# --------------------------------------------------------------------------- build

def build_view(view):
    parts = {}
    for side in ("l", "r"):
        fr = Frame(view, side)
        upper, forearm = arm_parts(fr, side)
        parts[f"arm_u_{side}"] = svg("".join(upper))
        parts[f"arm_l_{side}"] = svg("".join(forearm))
        thigh, shin = leg_parts(fr, side)
        parts[f"leg_u_{side}"] = svg("".join(thigh))
        parts[f"leg_l_{side}"] = svg("".join(shin))
        parts[f"foot_{side}"] = svg("".join(foot_part(fr, side)))
        hand_art = hands(fr, side)
        parts[f"hand_{side}"] = hand_art["rest"]
        for shape, doc in hand_art.items():
            parts.setdefault(f"__hand_{side}_{shape}", doc)
    body = Frame(view, "l")
    parts["torso"] = svg("".join(torso(body)))
    parts["head"] = svg("".join(head(body)))
    art = {key: parts[key] for key in PARTS}
    hand_art = {side: {shape: parts[f"__hand_{side}_{shape}"] for shape in HANDS} for side in ("l", "r")}

    a = FACE_ANCHOR.get(view)
    if a is None:
        eyes = {k: empty_svg() for k in ("open", "half", "closed")}
        expressions = {k: empty_svg() for k in FACES}
        emotion = {k: empty_svg() for k in FACES}
        mouths = {k: empty_svg() for k in MOUTHS}
        tear = empty_svg()
    else:
        sides = a.get("sides", FACE_SIDES)
        eyes = {"open": svg("".join(eye_open(a, side) for side in sides) + nose(a)),
                "half": svg("".join(eye_half(a, side) for side in sides) + nose(a)),
                "closed": svg("".join(eye_closed(a, side) for side in sides) + nose(a))}
        expressions = {k: expression(a, k) for k in FACES}
        emotion = {k: emotion_mouth(a, k) for k in FACES}
        mouths = {k: viseme_mouth(a, k) for k in MOUTHS}
        tear = tears(a)
    return dict(skeleton=skeleton(view), parts=art, rearArms=list(REAR_ARMS[view]),
                eyes=eyes, expressions=expressions, emotionMouths=emotion, mouths=mouths, tears=tear,
                hands=hand_art)


def skeleton(view):
    joints = {name: [r(x), r(y)] for name, (x, y) in JOINTS.items()}
    upper = math.hypot(JOINTS["elbow_r"][0] - JOINTS["shoulder_r"][0], JOINTS["elbow_r"][1] - JOINTS["shoulder_r"][1])
    fore = math.hypot(JOINTS["hand_r"][0] - JOINTS["elbow_r"][0], JOINTS["hand_r"][1] - JOINTS["elbow_r"][1])
    return {
        "version": 1,
        "space": {"width": SPACE[0], "height": SPACE[1]},
        "joints": joints,
        "parts": {
            "torso": {"box": [[130.0, 182.0], [270.0, 400.0]]},
            "head": {"box": [[160.0, 44.0], [240.0, 206.0]]},
            "upper_arm_l": {"capsule": {"from": "shoulder_l", "to": "elbow_l", "radius": 14.5}},
            "forearm_l": {"capsule": {"from": "elbow_l", "to": "hand_l", "radius": 13.0}},
            "hand_l": {"circle": {"at": "hand_l", "radius": 10.5}},
            "upper_arm_r": {"capsule": {"from": "shoulder_r", "to": "elbow_r", "radius": 14.5}},
            "forearm_r": {"capsule": {"from": "elbow_r", "to": "hand_r", "radius": 13.0}},
            "hand_r": {"circle": {"at": "hand_r", "radius": 10.5}},
            "thigh_l": {"capsule": {"from": "hip_l", "to": "knee_l", "radius": 26.0}},
            "shin_l": {"capsule": {"from": "knee_l", "to": "foot_l", "radius": 19.0}},
            "foot_l": {"box": [[155.0, 654.0], [196.0, 714.0]]},
            "thigh_r": {"capsule": {"from": "hip_r", "to": "knee_r", "radius": 26.0}},
            "shin_r": {"capsule": {"from": "knee_r", "to": "foot_r", "radius": 19.0}},
            "foot_r": {"box": [[204.0, 654.0], [245.0, 714.0]]},
        },
        "arm": {"upper": upper, "fore": fore, "handRadius": 10.5},
        # A heavy build folds less: the drawing declares a smaller waist pitch and a
        # smaller knee flexion than the athlete's 38 / 112, because thick thighs meet
        # each other before the hip does.
        "waist": {"pitchMax": 32},
        "leg": {"flexionMax": 104},
        "balance": {"stepLength": 88, "catchFraction": 0.5, "maxSteps": 3},
    }


def build():
    artwork = {"format": "svg-bone-parts", "views": {view: build_view(view) for view in VIEWS}}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "artwork.json").write_text(json.dumps(artwork, indent=1) + "\n")
    skeleton_doc = dict(skeleton("front"))
    (OUT / "skeleton.json").write_text(json.dumps(skeleton_doc, indent=2) + "\n")
    (OUT / "manifest.json").write_text(json.dumps({
        "model": {"name": "gymnast_parts.py (hand-authored native vector artwork)", "license": "AGPL-3.0-only"},
        "date": "2026-10-18",
        "approver": "pending art review",
        "notes": [
            "Gymnast 乙: compact heavy-set adult, sleeveless plum leotard, chalk-white hands and a chalk bag at the waist; five native views, original vector artwork, no raster or generated source.",
            "Style anchor figure/lin_b_draft (svg-bone-parts format). Measured against figure/athlete_a: front silhouette 199.5x662.5 (ratio 0.30) versus 178.5x669 (0.27), head 72 wide versus 52 at the same 125 height, shoulder joints 108 versus 96, thigh radius 26 versus 18, visible neck about 12 units versus 26.",
            "Legs are mirror-symmetric with thigh 158.03 / shin 160.01 (ratio 0.99); skeleton declares leg.flexionMax 104 and waist.pitchMax 32.",
            "Back and quarter-back views carry the hair over the whole occiput, a heel construction for the shoes and a back panel for the bags and hands; no stroke is near-white.",
            "Regenerate with python3 tools/art-direction-study/gymnast_parts.py; not a supported CLI.",
        ],
    }, indent=2) + "\n")


def stills(directory, view=None):
    """Rasterisable contact sheets: each part and hand shape on one frame."""
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    views = [view] if view else list(VIEWS)
    for name in views:
        data = build_view(name)
        shadow = '<rect x="0" y="0" width="400" height="720" fill="#eef1f4"/>'
        face = ""
        if name in FACE_ANCHOR:
            face = _inner(data["expressions"]["calm"]) + _inner(data["mouths"]["A"])
        def arm_chain(s):
            return (_inner(data["parts"][f"arm_u_{s}"]) + _inner(data["parts"][f"arm_l_{s}"]) +
                    _inner(data["hands"][s]["rest"]))
        rear = "".join(arm_chain(s) for s in data["rearArms"])
        front = "".join(arm_chain(s) for s in ("l", "r") if s not in data["rearArms"])
        composed = "".join(_inner(data["parts"][k]) for k in (
            "leg_u_l", "leg_l_l", "foot_l", "leg_u_r", "leg_l_r", "foot_r")) + rear + \
            _inner(data["parts"]["torso"]) + front + _inner(data["parts"]["head"])
        doc = (f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="720" '
               f'viewBox="0 0 400 720">{shadow}{composed}{face}</svg>')
        (directory / f"view-{name}.svg").write_text(doc)
        # The hand sheet shows the hand the camera sees first.
        hside = NEAR_SIDE[name] or "r"
        fr = Frame(name, hside)
        hx, hy = fr.j(f"hand_{hside}")
        hand_cells = []
        for i, shape in enumerate(HANDS):
            hand_cells.append(f'<g transform="translate({62 + i * 80} 62)">'
                              f'<rect x="-30" y="-42" width="76" height="96" fill="#ffffff" stroke="#c8d0d8"/>'
                              f'<g transform="translate({r(-hx)} {r(-hy)})">{_inner(data["hands"][hside][shape])}</g>'
                              f'<text x="-26" y="48" font-size="11" fill="#44505c">{shape}</text></g>')
        hands_doc = (f'<svg xmlns="http://www.w3.org/2000/svg" width="410" height="130" '
                     f'viewBox="0 0 410 130"><rect x="0" y="0" width="410" height="130" fill="#eef1f4"/>'
                     + "".join(hand_cells) + "</svg>")
        (directory / f"hands-{name}.svg").write_text(hands_doc)
    return sorted(p.name for p in directory.iterdir())


def _inner(doc):
    return doc.split(">", 1)[1].rsplit("</svg>", 1)[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stills", default=None)
    parser.add_argument("--view", default=None)
    args = parser.parse_args()
    if args.stills:
        print("\n".join(stills(args.stills, args.view)))
        return
    build()
    print(f"gymnast_parts: wrote {OUT/'artwork.json'} and {OUT/'skeleton.json'}")


if __name__ == "__main__":
    main()
