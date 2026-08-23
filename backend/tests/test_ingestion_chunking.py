from app.services.ingestion_service import clean_text, chunk_by_section


SAMPLE_TEXT = """
1 Overview
This is the overview section.

2 Annual Leave
Employees accrue 18 days per year.

2.1 Carryover
Up to 10 days may be carried over.
"""


def test_clean_text_normalizes_whitespace():
    dirty = "Line one\r\n\r\n\r\n\r\nLine two"
    cleaned = clean_text(dirty)
    assert "\r" not in cleaned
    assert "\n\n\n" not in cleaned


def test_chunk_by_section_splits_on_headers():
    chunks = chunk_by_section(clean_text(SAMPLE_TEXT))
    section_ids = [c["section_id"] for c in chunks]
    assert section_ids == ["1", "2", "2.1"]


def test_chunk_by_section_captures_titles():
    chunks = chunk_by_section(clean_text(SAMPLE_TEXT))
    titles = {c["section_id"]: c["section_title"] for c in chunks}
    assert titles["2"] == "Annual Leave"
    assert titles["2.1"] == "Carryover"


def test_chunk_by_section_captures_content():
    chunks = chunk_by_section(clean_text(SAMPLE_TEXT))
    overview = next(c for c in chunks if c["section_id"] == "1")
    assert "overview section" in overview["content"]


def test_falls_back_to_single_chunk_without_headers():
    plain_text = "Just a plain paragraph with no numbered headers at all."
    chunks = chunk_by_section(plain_text)
    assert len(chunks) == 1
    assert chunks[0]["section_id"] == "1"
