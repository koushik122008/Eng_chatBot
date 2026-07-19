"""Unit tests for the incremental stream parser. Run: python -m pytest backend/test_stream_parser.py
or plainly: python backend/test_stream_parser.py
"""
from backend.stream_parser import StreamParser


def run(chunks):
    p = StreamParser()
    events = []
    for c in chunks:
        events.extend(p.feed(c))
    events.extend(p.flush())
    # merge adjacent text events for easy assertions
    merged = []
    for kind, val in events:
        if kind == "text" and merged and merged[-1][0] == "text":
            merged[-1] = ("text", merged[-1][1] + val)
        else:
            merged.append((kind, val))
    return merged


def test_plain_text():
    assert run(["hello ", "world"]) == [("text", "hello world")]


def test_scene_in_one_chunk():
    ev = run(['before <scene>{"a": 1}</scene> after'])
    assert ev == [("text", "before "), ("scene_json", '{"a": 1}'), ("text", " after")]


def test_scene_split_across_chunks():
    ev = run(["intro <sc", "ene>{\"template\": ", '"wave"}</sce', "ne> outro"])
    assert ev == [("text", "intro "), ("scene_json", '{"template": "wave"}'), ("text", " outro")]


def test_anim_marker():
    ev = run(["flows here [[anim:electron-flow]] and on"])
    assert ev == [("text", "flows here "), ("anim", "electron-flow"), ("text", " and on")]


def test_anim_split():
    ev = run(["x [[a", "nim:sp", "in]] y"])
    assert ev == [("text", "x "), ("anim", "spin"), ("text", " y")]


def test_bracket_false_alarm():
    ev = run(["array[i] [not a tag] [", "[also not]] end"])
    text = "".join(v for k, v in ev if k == "text")
    assert text == "array[i] [not a tag] [[also not]] end"
    assert all(k == "text" for k, _ in ev)


def test_lt_false_alarm():
    ev = run(["a < b and a <s", "trong> c"])
    assert "".join(v for k, v in ev if k == "text") == "a < b and a <strong> c"


def test_unterminated_scene():
    ev = run(["x <scene>{\"never\": true"])
    assert ("error", "unterminated <scene> block") in ev


def test_scene_then_anims():
    ev = run(['<scene>{"t":1}</scene>text [[anim:a]] more [[anim:b]]!'])
    kinds = [k for k, _ in ev]
    assert kinds == ["scene_json", "text", "anim", "text", "anim", "text"]


if __name__ == "__main__":
    import sys, traceback

    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except Exception:
                failed += 1
                print(f"FAIL {name}")
                traceback.print_exc()
    sys.exit(1 if failed else 0)
