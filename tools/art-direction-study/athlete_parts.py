#!/usr/bin/env python3
"""Generate the native badminton-athlete figure artwork for library/figure/athlete_a.

Hand-authored vector geometry only: no raster, generated or paid source. The
figure is a tall lean young man in sportswear, drawn as one svg-bone-parts
figure with five native views. Legs are mirror-symmetric and thigh and shin are
of comparable length (ratio 1.01), which is the proportion defect the earlier
draft rig carried (1.73 / 1.91) and what makes a knee fold badly.

Run: python3 tools/art-direction-study/athlete_parts.py [--stills DIR] [--view NAME]
"""
import argparse
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "library/figure/athlete_a"
SPACE = (400, 720)
VIEWS = ("front", "quarter", "side", "back", "quarter_back")
PARTS = ("torso", "head", "arm_u_l", "arm_l_l", "hand_l", "arm_u_r", "arm_l_r", "hand_r",
         "leg_u_l", "leg_l_l", "foot_l", "leg_u_r", "leg_l_r", "foot_r")
FACES = ("calm", "shock", "fear", "desperate", "confused", "skeptical", "embarrassed",
         "relief", "excited", "proud", "somber")
MOUTHS = ("A", "B", "C", "D", "E", "F", "G", "H", "X")
HANDS = ("rest", "open", "point", "fist", "splayed")

# Palette: sportswear blue and slate, warm tan skin, near-black cropped hair.
# Chosen to separate from figure/lin_b_draft (teal, cream, tied bun) by hue and
# value, but the silhouette, head size and leg proportion carry the difference.
# TRIM is the white kit colour - the socks and the wristband - and is only ever a
# fill on a closed limb or garment shape. A near-white *stroke* reads as a
# construction guide: it is brighter than the jersey, and its round caps poke
# past the outline it was meant to sit inside. Garment seams are drawn in a
# garment shade instead.
INK = "#2b2f33"
SKIN = "#dda87a"
SKIN_SHADE = "#c48f61"
SKIN_LINE = "#a3703f"
HAIR = "#241f1c"
HAIR_LIGHT = "#3b322c"
JERSEY = "#3f7fd0"
JERSEY_SHADE = "#2f66ab"
TRIM = "#f2f5f8"
TROUSER = "#2e3844"
TROUSER_SHADE = "#222a33"
SOCK = "#f2f5f8"
SHOE = "#f6f7f4"
SHOE_SHADE = "#d5dade"
SHOE_SOLE = "#38414a"
EYE_WHITE = "#f7f3e6"
PUPIL = "#26313a"
MOUTH = "#a25a4a"

# Joints: one person, mirror-symmetric about x=400/2. Thigh 157.03, shin 159.01.
JOINTS = {
    "waist": (200.0, 336.0),
    "neck": (200.0, 182.0),
    "shoulder_l": (152.0, 202.0), "elbow_l": (139.0, 278.0), "hand_l": (128.0, 356.0),
    "shoulder_r": (248.0, 202.0), "elbow_r": (261.0, 278.0), "hand_r": (272.0, 356.0),
    "hip_l": (186.0, 352.0), "knee_l": (183.0, 509.0), "foot_l": (181.0, 668.0),
    "hip_r": (214.0, 352.0), "knee_r": (217.0, 509.0), "foot_r": (219.0, 668.0),
}

# The five views are five constructions, not one drawing compressed: each has
# its own hand-authored torso and head silhouette, and each side of a turned
# view carries its own lateral squeeze and screen shift. A far limb is narrower
# (`k`), sits closer to the body axis (its `dx` points inward) and is drawn
# behind the torso through REAR_ARMS. `near` is the side facing the camera.
# Near = "l" throughout because a figure whose left side comes toward the camera
# turns its face to screen-right, which is the direction the profile and quarter
# heads are drawn in.
SIDE_PROJECTION = {
    "front": {"l": (1.00, -2.0, 1.00), "r": (1.00, 2.0, 1.00)},
    "quarter": {"l": (1.00, -4.0, 1.00), "r": (0.70, -6.0, 0.82)},
    "side": {"l": (0.28, 4.5, 1.00), "r": (0.28, -16.4, 0.86)},
    "back": {"l": (1.00, -2.0, 1.00), "r": (1.00, 2.0, 1.00)},
    "quarter_back": {"l": (1.00, -4.0, 1.00), "r": (0.70, -6.0, 0.82)},
}
LEG_PROJECTION = {
    "front": {"l": (1.00, -1.0, 1.00), "r": (1.00, 1.0, 1.00)},
    "quarter": {"l": (1.00, -2.0, 1.00), "r": (0.74, -5.0, 0.84)},
    "side": {"l": (0.26, 9.0, 1.00), "r": (0.26, 1.0, 0.88)},
    "back": {"l": (1.00, -1.0, 1.00), "r": (1.00, 1.0, 1.00)},
    "quarter_back": {"l": (1.00, -2.0, 1.00), "r": (0.74, -5.0, 0.84)},
}
NEAR_SIDE = {"front": None, "quarter": "l", "side": "l", "back": None, "quarter_back": "l"}
# How much of a shoe's width survives the view's turn. A frontal construction keeps
# the whole sole; a quarter view foreshortens it, so the shoes turn with the body.
TURN_WIDTH = {"front": 1.0, "quarter": 0.78, "back": 1.0, "quarter_back": 0.78}
# Arms drawn behind the torso: the torso then covers the sleeve cap, so the arm
# grows out of the jersey instead of butting against it.
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
# side from the shoulder to the hem. The near side of a turned view widens and
# the far side foreshortens toward the body axis, so the outline is asymmetric.
TORSO_OUTLINE = {
    "front": {"left": ((180, 186), (142, 192), (146, 252), (152, 320), (150, 404)),
              "right": ((220, 186), (258, 192), (254, 252), (248, 320), (250, 404))},
    "quarter": {"left": ((176, 184), (136, 190), (140, 250), (146, 320), (142, 402)),
                "right": ((222, 190), (240, 202), (241, 256), (236, 322), (240, 402))},
    # Profile: chest and back are separate edges, not a mirrored pair.
    "side": {"left": ((196, 180), (176, 200), (174, 240), (180, 300), (186, 340), (178, 400)),
             "right": ((212, 180), (230, 206), (233, 248), (228, 300), (232, 340), (226, 400))},
    "back": {"left": ((180, 192), (144, 198), (146, 256), (152, 322), (150, 404)),
             "right": ((220, 192), (256, 198), (254, 256), (248, 322), (250, 404))},
    "quarter_back": {"left": ((174, 192), (138, 198), (142, 258), (148, 322), (142, 402)),
                     "right": ((224, 196), (242, 208), (242, 260), (236, 322), (240, 402))},
}


def silhouette(left, right):
    loop = [*left, right[-1], *reversed(right[:-1])]
    return smooth(loop)


def torso(fr):
    v = fr.view
    left, right = TORSO_OUTLINE[v]["left"], TORSO_OUTLINE[v]["right"]
    nodes = [filled(silhouette(left, right), JERSEY, INK, 2.0)]
    if v in ("back", "quarter_back"):
        shift = -3.0 if v == "quarter_back" else 0.0
        nodes.append(path(f"M {pt(200 + shift, 224)} L {pt(200 + shift, 392)}", "none", JERSEY_SHADE, 1.2))
        nodes.append(path(f"M {pt(172, 248)} Q {pt(186, 276)} {pt(182, 316)}", "none", JERSEY_SHADE, 1.2))
    if v == "quarter":
        nodes.append(path(f"M {pt(232, 214)} Q {pt(240, 262)} {pt(234, 310)}", "none", JERSEY_SHADE, 1.4))
    if v == "side":
        nodes.append(path(f"M {pt(228, 246)} Q {pt(220, 282)} {pt(226, 322)}", "none", JERSEY_SHADE, 1.3))
        nodes.append(path(f"M {pt(196, 200)} Q {pt(184, 258)} {pt(190, 340)}", "none", JERSEY_SHADE, 1.3))
    return nodes


# ---------------------------------------------------------------------------- head

FRONT_FACE = ((204, 44), (222, 82), (226, 114), (214, 150), (200, 168),
              (186, 150), (174, 114), (178, 82))


def collar(cx):
    """Jersey neckline drawn over the neck's foot, so the neck meets the collar in a
    curve instead of a hard step where two rectangles cross."""
    return filled(f"M {pt(cx - 17, 194)} Q {pt(cx, 206)} {pt(cx + 17, 194)} L {pt(cx + 17, 214)} "
                  f"Q {pt(cx, 218)} {pt(cx - 17, 214)} Z", JERSEY, INK, 1.4)


def head(fr):
    v = fr.view
    if v != "side":
        shift = {"front": 0.0, "back": 0.0, "quarter": 5.0, "quarter_back": -5.0}[v]
        squeeze = 1.0 if v in ("front", "back") else 0.9
        face_pts = tuple((200 + (p[0] - 200) * squeeze + shift, p[1]) for p in FRONT_FACE)
        cx = 200 + shift
        neck = [filled(f"M {pt(cx - 10, 152)} L {pt(cx + 10, 152)} L {pt(cx + 12, 206)} "
                       f"L {pt(cx - 12, 206)} Z", SKIN_SHADE, INK, 1.4), collar(cx)]
        nodes = neck + [filled(smooth(face_pts), SKIN, INK, 2.0)]
        # Near-side features only on a turned head: the far ear has gone round the
        # back of the skull, and a back-of-head shows no ear at all.
        if v == "front":
            nodes += [ring(cx - 25, 112, 5.0, SKIN_SHADE, INK, 1.2),
                      ring(cx + 25, 112, 5.0, SKIN_SHADE, INK, 1.2)]
        elif v == "quarter":
            nodes += [ring(cx - 25, 112, 5.0, SKIN_SHADE, INK, 1.2)]
        if v == "quarter_back":
            # The near cheek and ear edge come after the hair: on a back view the hair
            # fills the skull, so the sliver of face turned toward the camera has to
            # sit in front of it instead of on bare skin.
            near = [filled(f"M {pt(cx - 28, 96)} Q {pt(cx - 33, 118)} {pt(cx - 27, 136)} "
                           f"L {pt(cx - 20, 130)} Q {pt(cx - 23, 112)} {pt(cx - 22, 98)} Z",
                           SKIN, INK, 1.0),
                    ring(cx - 24, 114, 5.0, SKIN_SHADE, INK, 1.2)]
        else:
            near = []
        if v in ("front", "quarter"):
            near_only = v == "quarter"
            nodes += [filled(f"M {pt(cx - 30, 100)} Q {pt(cx - 30, 52)} {pt(cx - 6, 42)} "
                             f"Q {pt(cx + 16, 30)} {pt(cx + 30, 54)} Q {pt(cx + 34, 68)} "
                             f"{pt(cx + 27, 82)} Q {pt(cx + 22, 60)} {pt(cx + 2, 60)} "
                             f"Q {pt(cx - 16, 62)} {pt(cx - 21, 100)} Z", HAIR, INK, 1.8),
                      filled(f"M {pt(cx - 4, 42)} Q {pt(cx + 12, 31)} {pt(cx + 28, 50)} "
                             f"L {pt(cx + 12, 44)} Q {pt(cx + 2, 38)} {pt(cx - 4, 46)} Z",
                             HAIR_LIGHT, HAIR_LIGHT, 0.6),
                      filled(f"M {pt(cx - 24, 86)} L {pt(cx - 18, 82)} L {pt(cx - 19, 118)} "
                             f"L {pt(cx - 24, 114)} Z", HAIR, INK, 1.0)]
            if not near_only:
                nodes += [filled(f"M {pt(cx + 24, 86)} L {pt(cx + 18, 82)} L {pt(cx + 19, 118)} "
                                 f"L {pt(cx + 24, 114)} Z", HAIR, INK, 1.0)]
        else:
            # Back of the head: the hair fills the whole skull down to the nape. As a
            # crown-only crescent it left the occiput as a bare skin oval under a band
            # of hair, so the character read as bald from behind. The crown contour is
            # unchanged; below the temple the edge follows the skull outline a little
            # outside it (the hair is the outer shape here, so no background sliver can
            # open between the two) and turns into a short nape curve that the neck
            # rises into, which leaves no skin on the back of the head.
            nodes += [filled(f"M {pt(cx - 30, 100)} Q {pt(cx - 32, 48)} {pt(cx - 2, 40)} "
                             f"Q {pt(cx + 28, 40)} {pt(cx + 30, 74)} Q {pt(cx + 31, 96)} "
                             f"{pt(cx + 29, 114)} Q {pt(cx + 24, 136)} {pt(cx + 13, 154)} "
                             f"Q {pt(cx + 7, 164)} {pt(cx, 165)} Q {pt(cx - 7, 164)} "
                             f"{pt(cx - 13, 154)} Q {pt(cx - 24, 136)} {pt(cx - 29, 114)} Z",
                             HAIR, INK, 1.8),
                      path(f"M {pt(cx - 6, 54)} Q {pt(cx + 10, 58)} {pt(cx + 16, 80)}", "none",
                           HAIR_LIGHT, 1.6)]
        return nodes + near
    # Profile: faces screen-right, drawn around the same neck pivot.
    neck = [filled(f"M {pt(192, 152)} L {pt(214, 152)} L {pt(216, 206)} L {pt(190, 206)} Z",
                   SKIN_SHADE, INK, 1.4),
            filled(f"M {pt(186, 194)} Q {pt(204, 200)} {pt(222, 192)} L {pt(222, 214)} "
                   f"Q {pt(204, 218)} {pt(186, 214)} Z", JERSEY, INK, 1.4)]
    profile = [filled(smooth([(208, 44), (226, 62), (231, 92), (233, 110), (241, 124),
                              (233, 130), (234, 138), (231, 144), (231, 156), (218, 168),
                              (200, 172), (186, 158), (180, 128), (182, 90), (190, 58)]),
                      SKIN, INK, 2.0)]
    # The ear is part of the profile, not a mark on the cheek. Its rear edge runs just
    # inside the skull contour and its top edge meets the hair's lower edge, so both
    # inks merge into those outlines and no closed ear outline shows against the skin;
    # only the shell and the helix do. Drawn as a ring at mid-cheek it read as a
    # standalone dot floating in the face fill.
    ear = [filled("M 181.5 112 Q 190 106 195 112 Q 199 120 195 128 Q 190 134 181.5 132 Z",
                  SKIN_SHADE, INK, 1.0),
           path("M 188 116 Q 193 121 189 128", "none", SKIN_LINE, 0.9)]
    hair = [filled(smooth([(188, 56), (206, 40), (226, 50), (231, 78), (230, 94), (219, 84),
                           (206, 86), (196, 110), (188, 114), (180, 98), (178, 74)]),
                   HAIR, INK, 1.8),
            filled("M 198 42 Q 216 32 230 46 L 216 47 Q 206 41 200 51 Z", HAIR_LIGHT, HAIR_LIGHT, 0.6),
            filled("M 184 106 Q 178 82 186 66 L 196 74 L 190 114 Z", HAIR, INK, 1.0)]
    return neck + profile + ear + hair


# ---------------------------------------------------------------------------- arms

def arm_parts(fr, side):
    """Short sleeve to mid upper arm, bare skin below, wristband at the wrist.

    The sleeve cap is buried in the torso by an unstroked jersey socket, and the
    elbow by an unstroked skin socket, so the limb overlaps its parent shape
    rather than abutting it: no background can show through the attachment.
    """
    shoulder = fr.j(f"shoulder_{side}")
    elbow = fr.j(f"elbow_{side}")
    hand = fr.j(f"hand_{side}")
    inward = 1.0 if side == "l" else -1.0
    r_shoulder, r_sleeve, r_arm = fr.r(17.0), fr.r(13.5), fr.r(11.0)
    r_fore, r_wrist = fr.r(10.0), fr.r(7.0)
    sleeve_end = (shoulder[0] + (elbow[0] - shoulder[0]) * 0.58,
                  shoulder[1] + (elbow[1] - shoulder[1]) * 0.58)
    band = (elbow[0] + (hand[0] - elbow[0]) * 0.82, elbow[1] + (hand[1] - elbow[1]) * 0.82)
    band_end = (elbow[0] + (hand[0] - elbow[0]) * 0.96, elbow[1] + (hand[1] - elbow[1]) * 0.96)
    upper = [socket(shoulder[0] + inward * 8.0, shoulder[1] + 4.0, fr.r(18.0), JERSEY),
             limb(shoulder, sleeve_end, r_shoulder, r_sleeve, JERSEY, INK, 1.6),
             limb(sleeve_end, elbow, r_arm, r_arm * 0.92, SKIN, INK, 1.4),
             ]
    # Nothing is drawn down the middle of the forearm: a thin stroke there reads as a
    # construction mark, not as the limb's own shading.
    forearm = [socket(elbow[0], elbow[1], r_arm * 0.92 + 1.4, SKIN),
               limb(elbow, band, r_fore, r_wrist * 1.1, SKIN, INK, 1.4),
               limb(band, band_end, r_wrist * 1.1, r_wrist * 1.02, TRIM, INK, 1.0)]
    return upper, forearm


# ---------------------------------------------------------------------------- legs

def leg_parts(fr, side):
    """Track trousers: roomy at the hip, tapered to a hem above a white sock.

    A far leg of a turned view is narrower, sits behind the near leg and is drawn
    without its own outline, so its silhouette cannot cut a seam across the near
    leg. Unstroked sockets at the hip and knee keep every join closed.
    """
    hip = fr.j(f"hip_{side}")
    knee = fr.j(f"knee_{side}")
    foot = fr.j(f"foot_{side}")
    far = NEAR_SIDE[fr.view] is not None and side != NEAR_SIDE[fr.view]
    fill = TROUSER_SHADE if far else TROUSER
    edge = fill if far else INK
    r_hip, r_knee, r_ankle = fr.r(21.0), fr.r(15.0), fr.r(9.5)
    shade = fill if far else TROUSER_SHADE
    thigh = [socket(hip[0], hip[1] - 26, fr.r(22.0), fill),
             limb((hip[0], hip[1] - 30), knee, r_hip, r_knee, fill, edge, 1.7),
             path(f"M {pt(hip[0] + (3 if side == 'l' else -3), hip[1] - 20)} "
                  f"Q {pt(knee[0] + (4 if side == 'l' else -4), knee[1] - 40)} "
                  f"{pt(knee[0] + (3 if side == 'l' else -3), knee[1] - 6)}",
                  "none", shade, 1.1)]
    ankle = (foot[0], foot[1] - 14)
    shin = [socket(knee[0], knee[1], r_knee + 2.0, fill),
            limb(knee, ankle, r_knee * 0.98, r_ankle, fill, edge, 1.7),
            limb((foot[0], foot[1] - 32), ankle, r_ankle * 1.16, r_ankle * 1.05, fill, edge, 1.4),
            limb(ankle, (foot[0], foot[1] - 2), r_ankle * 0.98, r_ankle * 0.94, SOCK,
                 edge if far else INK, 1.1)]
    return thigh, shin


def foot_part(fr, side):
    x, y = fr.j(f"foot_{side}")
    far = NEAR_SIDE[fr.view] is not None and side != NEAR_SIDE[fr.view]
    if fr.view == "side":
        x += 3 if not far else -7
        sole = SHOE_SOLE if not far else TROUSER_SHADE
        body = SHOE if not far else SHOE_SHADE
        edge = INK if not far else SHOE_SHADE
        return [filled(f"M {pt(x - 12, y - 12)} Q {pt(x + 6, y - 16)} {pt(x + 14, y - 4)} "
                       f"L {pt(x + 34, y + 20)} Q {pt(x + 39, y + 32)} {pt(x + 24, y + 40)} "
                       f"L {pt(x - 13, y + 40)} Q {pt(x - 18, y + 18)} {pt(x - 12, y - 12)} Z",
                       body, edge, 1.8),
                path(f"M {pt(x + 2, y + 2)} Q {pt(x + 20, y + 6)} {pt(x + 32, y + 20)}",
                     "none", JERSEY, 3.0),
                path(f"M {pt(x - 17, y + 28)} Q {pt(x - 2, y + 30)} {pt(x + 12, y + 30)}",
                     "none", SHOE_SHADE, 1.6),
                filled(f"M {pt(x - 17, y + 31)} L {pt(x + 12, y + 31)} Q {pt(x + 30, y + 33)} "
                       f"{pt(x + 24, y + 42)} L {pt(x - 14, y + 42)} Q {pt(x - 18, y + 36)} "
                       f"{pt(x - 17, y + 31)} Z", sole, sole, 0.0)]
    toe = -5.0 if side == "l" else 5.0
    body = SHOE if not far else SHOE_SHADE
    edge = INK if not far else SHOE_SHADE
    sole = SHOE_SOLE if not far else TROUSER_SHADE
    # A foot belongs to its leg, so it turns with the body: in the two quarter views
    # the shoe is foreshortened across the screen instead of being a front-facing
    # copy. Its vertical extent is unchanged so the shoe still meets the sock, and
    # narrowing only ever removes coverage, so it cannot open a background hole.
    turn = TURN_WIDTH[fr.view] * fr.k
    ox = lambda offset: x + offset * turn
    if fr.view in ("back", "quarter_back"):
        # Seen from behind the toes have turned away: the shoe is a heel. No toe box,
        # no laces and no side flash - a counter seam wrapping a centre stitch over
        # the sole, which is what distinguishes it from the same shoe seen from the
        # front. Width stays the shoe's own, because depth recedes rather than width.
        return [socket(x, y - 8, fr.r(15.0) * turn, body),
                filled(f"M {pt(ox(-15), y - 4)} Q {pt(x, y - 13)} {pt(ox(15), y - 4)} "
                       f"Q {pt(ox(18), y + 12)} {pt(ox(17), y + 29)} "
                       f"Q {pt(x, y + 34)} {pt(ox(-17), y + 29)} "
                       f"Q {pt(ox(-18), y + 12)} {pt(ox(-15), y - 4)} Z", body, edge, 1.8),
                path(f"M {pt(x, y + 2)} L {pt(x, y + 27)}", "none", SHOE_SHADE, 1.1),
                path(f"M {pt(ox(-13), y + 18)} Q {pt(ox(-14), y + 5)} {pt(ox(-5), y + 1)}",
                     "none", SHOE_SHADE, 1.3),
                path(f"M {pt(ox(13), y + 18)} Q {pt(ox(14), y + 5)} {pt(ox(5), y + 1)}",
                     "none", SHOE_SHADE, 1.3),
                filled(f"M {pt(ox(-18), y + 27)} Q {pt(x, y + 33)} {pt(ox(18), y + 27)} "
                       f"L {pt(ox(17), y + 33)} Q {pt(x, y + 42)} {pt(ox(-17), y + 33)} Z",
                       sole, sole, 0.0)]
    nodes = [socket(x, y - 8, fr.r(15.0) * turn, body),
             filled(f"M {pt(ox(-16), y - 10)} Q {pt(x, y - 17)} {pt(ox(16), y - 10)} "
                    f"Q {pt(ox(19), y + 10)} {pt(ox(17 + toe * 0.5), y + 32)} "
                    f"Q {pt(ox(toe), y + 40)} {pt(ox(-17 + toe * 0.5), y + 32)} "
                    f"Q {pt(ox(-19), y + 10)} {pt(ox(-16), y - 10)} Z", body, edge, 1.8)]
    # Front construction: toe box, laces and a side flash, so the shoe is the same
    # shoe seen from the front, whatever its turn.
    nodes += [path(f"M {pt(ox(-9), y - 6)} Q {pt(x, y - 2)} {pt(ox(9), y - 6)}", "none", SHOE_SHADE, 1.4),
              path(f"M {pt(ox(-10), y + 4)} L {pt(ox(10), y + 4)}", "none", SHOE_SHADE, 1.2)]
    nodes += [path(f"M {pt(ox(-11), y + 14)} L {pt(ox(11), y + 14)}", "none", JERSEY, 3.0),
              filled(f"M {pt(ox(-18), y + 28)} Q {pt(ox(toe * 0.5), y + 35)} "
                     f"{pt(ox(18 + toe * 0.5), y + 28)} "
                     f"L {pt(ox(17 + toe * 0.5), y + 34)} Q {pt(ox(toe * 0.5), y + 43)} "
                     f"{pt(ox(-17 + toe * 0.5), y + 34)} Z", sole, sole, 0.0)]
    return nodes


# --------------------------------------------------------------------------- hands

def _palm():
    return "M -10 -8 Q 0 -11 10 -8 Q 13 4 12 18 L -12 18 Q -13 4 -10 -8 Z"


def hand_shape(shape, mirror, back=False):
    """One hand, palm or back. Which side the thumb sits on is the whole difference
    between the two, so a back-facing view flips the thumb and the fist crease across
    the hand's own axis and leaves the fingers where they are.
    """
    flip = -1.0 if back else 1.0
    nodes = [filled(_palm(), SKIN, INK, 1.1)]
    curl, length = {"rest": (0.55, 16), "open": (0.0, 28), "point": (0.0, 27), "fist": (1.0, 8),
                    "splayed": (-0.18, 27)}[shape]
    xs = (-8.0, -2.8, 2.8, 8.0)
    for i, fx in enumerate(xs):
        h = length - (abs(i - 1) * 1.8 if shape == "splayed" else 0.0)
        if shape == "point" and i != 1:
            h = 8
        if shape == "fist":
            nodes.append(filled(f"M {pt(fx - 2.6, 15)} L {pt(fx + 2.6, 15)} L {pt(fx + 2.6, 25)} "
                                f"Q {pt(fx, 29)} {pt(fx - 2.6, 25)} Z", SKIN, SKIN_LINE, 0.7))
            continue
        spread = 0.0 if shape != "splayed" else (i - 1.5) * 5.0
        nodes.append(filled(f"M {pt(fx - 2.7, 14)} L {pt(fx + 2.7, 14)} "
                            f"L {pt(fx + 2.5 + spread, 13 + h)} Q {pt(fx + spread, 18 + h)} "
                            f"{pt(fx - 2.5 + spread, 13 + h)} Z", SKIN, SKIN_LINE, 0.7))
    thumb = (f"M {pt(-10 * flip, 0)} Q {pt(-18 * flip, 6)} {pt(-16 * flip, 14)} "
             f"Q {pt(-14 * flip, 20)} {pt(-9 * flip, 17)} Z")
    nodes.append(filled(thumb, SKIN, SKIN_LINE, 0.9))
    if shape == "fist":
        nodes.append(path(f"M {pt(-13 * flip, 4)} Q {pt(-4 * flip, 12)} {pt(5 * flip, 10)}",
                          "none", SKIN_LINE, 1.1))
    if mirror:
        return [n.replace("<path", '<path data-mirror="1"') for n in nodes]
    return nodes


def hands(fr, side):
    x, y = fr.j(f"hand_{side}")
    mirror = side == "l"
    back = fr.view in ("back", "quarter_back")
    parts = {}
    for shape in HANDS:
        nodes = hand_shape(shape, mirror, back)
        inner = "".join(nodes)
        sx = -1.2 if mirror else 1.2
        parts[shape] = svg(f'<g transform="translate({r(x)} {r(y)}) scale({sx} 1.2)" '
                           f'data-kind="hand">{inner}</g>')
    return parts


# ---------------------------------------------------------------------------- face

FACE_ANCHOR = {
    "front": dict(cx=200.0, ex=14.0, ew=1.0, eye=104.0, brow=92.0, mouth=140.0, mw=1.0, skew=0.0),
    "quarter": dict(cx=205.0, ex=12.4, ew=0.86, eye=104.0, brow=92.0, mouth=140.0, mw=0.86, skew=3.0),
    "side": dict(cx=224.0, ex=4.0, ew=0.42, eye=106.0, brow=94.0, mouth=142.0, mw=0.42, skew=8.0),
}


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
    nodes = [eye_open(a, "l"), eye_open(a, "r"), nose(a),
             brow(a, "l", max(lift, 0.0), angle), brow(a, "r", max(lift, 0.0), angle)]
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
    for side in ("l", "r"):
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
        eyes = {"open": svg(eye_open(a, "l") + eye_open(a, "r") + nose(a)),
                "half": svg(eye_half(a, "l") + eye_half(a, "r") + nose(a)),
                "closed": svg(eye_closed(a, "l") + eye_closed(a, "r") + nose(a))}
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
            "torso": {"box": [[132.0, 194.0], [268.0, 404.0]]},
            "head": {"box": [[170.0, 38.0], [232.0, 208.0]]},
            "upper_arm_l": {"capsule": {"from": "shoulder_l", "to": "elbow_l", "radius": 12.0}},
            "forearm_l": {"capsule": {"from": "elbow_l", "to": "hand_l", "radius": 10.0}},
            "hand_l": {"circle": {"at": "hand_l", "radius": 9.5}},
            "upper_arm_r": {"capsule": {"from": "shoulder_r", "to": "elbow_r", "radius": 12.0}},
            "forearm_r": {"capsule": {"from": "elbow_r", "to": "hand_r", "radius": 10.0}},
            "hand_r": {"circle": {"at": "hand_r", "radius": 9.5}},
            "thigh_l": {"capsule": {"from": "hip_l", "to": "knee_l", "radius": 18.0}},
            "shin_l": {"capsule": {"from": "knee_l", "to": "foot_l", "radius": 13.0}},
            "foot_l": {"box": [[163.0, 658.0], [199.0, 710.0]]},
            "thigh_r": {"capsule": {"from": "hip_r", "to": "knee_r", "radius": 18.0}},
            "shin_r": {"capsule": {"from": "knee_r", "to": "foot_r", "radius": 13.0}},
            "foot_r": {"box": [[201.0, 658.0], [237.0, 710.0]]},
        },
        "arm": {"upper": upper, "fore": fore, "handRadius": 9.5},
        "waist": {"pitchMax": 38},
        "leg": {"flexionMax": 112},
        "balance": {"stepLength": 96, "catchFraction": 0.5, "maxSteps": 3},
    }


def build():
    artwork = {"format": "svg-bone-parts", "views": {view: build_view(view) for view in VIEWS}}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "artwork.json").write_text(json.dumps(artwork, indent=1) + "\n")
    skeleton_doc = dict(skeleton("front"))
    (OUT / "skeleton.json").write_text(json.dumps(skeleton_doc, indent=2) + "\n")
    (OUT / "manifest.json").write_text(json.dumps({
        "model": {"name": "athlete_parts.py (hand-authored native vector artwork)", "license": "AGPL-3.0-only"},
        "date": "2026-10-18",
        "approver": "pending art review",
        "notes": [
            "Badminton athlete 甲: tall lean young man, sportswear, five native views; original vector artwork, no raster or generated source.",
            "Style anchor figure/lin_b_draft (svg-bone-parts format); differs in silhouette, 5.6-head proportions, cropped hair, short sleeves and palette.",
            "Legs are mirror-symmetric with thigh 157.0 / shin 159.0 (ratio 1.01); skeleton declares leg.flexionMax 112.",
            "Regenerate with python3 tools/art-direction-study/athlete_parts.py; not a supported CLI.",
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
        fr = Frame(name, "r")
        hx, hy = fr.j("hand_r")
        hand_cells = []
        for i, shape in enumerate(HANDS):
            hand_cells.append(f'<g transform="translate({62 + i * 80} 62)">'
                              f'<rect x="-30" y="-42" width="76" height="96" fill="#ffffff" stroke="#c8d0d8"/>'
                              f'<g transform="translate({r(-hx)} {r(-hy)})">{_inner(data["hands"]["r"][shape])}</g>'
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
    print(f"athlete_parts: wrote {OUT/'artwork.json'} and {OUT/'skeleton.json'}")


if __name__ == "__main__":
    main()
