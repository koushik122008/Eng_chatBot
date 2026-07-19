"""Incremental parser for Claude's streamed output.

Claude's response text carries two in-band conventions:

  <scene>{ ...json... }</scene>   -- a 3D scene spec (at most once per reply)
  [[anim:some-id]]                -- an animation sync marker

Tags can be split across arbitrary stream-chunk boundaries, so this parser is
stateful: feed() it each text delta and it yields events; call flush() at the
end of the stream.

Events are (kind, value) tuples:
  ("text", str)        visible text to forward to the client
  ("scene_json", str)  raw JSON between <scene> tags (caller validates/parses)
  ("anim", str)        animation id from an [[anim:...]] marker
  ("error", str)       malformed input (e.g. unterminated <scene> at EOF)
"""
from collections.abc import Iterator

SCENE_OPEN = "<scene>"
SCENE_CLOSE = "</scene>"
ANIM_OPEN = "[[anim:"
ANIM_CLOSE = "]]"

# A buffered scene larger than this is treated as malformed rather than
# buffering without bound.
MAX_SCENE_LEN = 20_000

Event = tuple[str, str]


def _held_suffix_len(buf: str) -> int:
    """Length of the longest buffer suffix that could begin a tag."""
    max_check = max(len(SCENE_OPEN), len(ANIM_OPEN)) - 1
    for n in range(min(max_check, len(buf)), 0, -1):
        suffix = buf[-n:]
        if SCENE_OPEN.startswith(suffix) or ANIM_OPEN.startswith(suffix):
            return n
    return 0


class StreamParser:
    def __init__(self) -> None:
        self._buf = ""
        self._in_scene = False
        self._scene_buf = ""

    def feed(self, delta: str) -> Iterator[Event]:
        self._buf += delta
        yield from self._drain(final=False)

    def flush(self) -> Iterator[Event]:
        yield from self._drain(final=True)
        if self._in_scene:
            yield ("error", "unterminated <scene> block")
            self._in_scene = False
            self._scene_buf = ""
        elif self._buf:
            yield ("text", self._buf)
            self._buf = ""

    def _drain(self, final: bool) -> Iterator[Event]:
        while True:
            if self._in_scene:
                close = self._buf.find(SCENE_CLOSE)
                if close == -1:
                    # Keep everything except a possible partial "</scene>" suffix.
                    hold = 0
                    for n in range(len(SCENE_CLOSE) - 1, 0, -1):
                        if self._buf.endswith(SCENE_CLOSE[:n]):
                            hold = n
                            break
                    take = len(self._buf) - hold
                    self._scene_buf += self._buf[:take]
                    self._buf = self._buf[take:]
                    if len(self._scene_buf) > MAX_SCENE_LEN:
                        yield ("error", "scene spec too large")
                        self._in_scene = False
                        self._scene_buf = ""
                    return
                self._scene_buf += self._buf[:close]
                self._buf = self._buf[close + len(SCENE_CLOSE):]
                yield ("scene_json", self._scene_buf.strip())
                self._in_scene = False
                self._scene_buf = ""
                continue

            scene_at = self._buf.find(SCENE_OPEN)
            anim_at = self._buf.find(ANIM_OPEN)
            candidates = [(p, t) for p, t in ((scene_at, "scene"), (anim_at, "anim")) if p != -1]
            if not candidates:
                hold = 0 if final else _held_suffix_len(self._buf)
                take = len(self._buf) - hold
                if take > 0:
                    yield ("text", self._buf[:take])
                    self._buf = self._buf[take:]
                return

            pos, tag = min(candidates)
            if pos > 0:
                yield ("text", self._buf[:pos])
                self._buf = self._buf[pos:]

            if tag == "scene":
                self._buf = self._buf[len(SCENE_OPEN):]
                self._in_scene = True
                continue

            # anim marker: need the closing "]]" before we can emit it
            close = self._buf.find(ANIM_CLOSE, len(ANIM_OPEN))
            if close == -1:
                if final or len(self._buf) > 200:
                    # Malformed / unterminated marker: pass through as text.
                    yield ("text", self._buf)
                    self._buf = ""
                return
            anim_id = self._buf[len(ANIM_OPEN):close].strip()
            self._buf = self._buf[close + len(ANIM_CLOSE):]
            if anim_id:
                yield ("anim", anim_id)
