"""Subset a font to Latin + Vietnamese and save as woff2 (what themes must cover).

Usage:  python3 tools/subset-font.py <in.ttf> <out.woff2> [--axis wght=600 ...]
Needs:  pip install fonttools brotli
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

UNICODES = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,"
    "U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD,"
    "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,"
    "U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB"
)

def main(argv):
    src, out, *rest = argv
    axes = {}
    for i, a in enumerate(rest):
        if a == "--axis":
            k, v = rest[i + 1].split("=")
            axes[k] = float(v)
    font = TTFont(src)
    if axes and "fvar" in font:
        font = instantiateVariableFont(font, axes)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    font.flavor = "woff2"
    font.save(out)
    print(out)

if __name__ == "__main__":
    main(sys.argv[1:])
