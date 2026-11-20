// Synthetic identifier-shaped input that must never be persisted as an audit reason.
export const IDENTIFIER_TEXT_REASONS = [
    "ตรวจทะเบียนเลข 123.456.789.0123",
    "ตรวจทะเบียนเลข 123 456 789 0123",
    "ตรวจทะเบียนเลข G123-456-789-0123",
    "ตรวจทะเบียนเลข １２３．４５６．７８９．０１２３",
    "ตรวจทะเบียนเลข ๑๒๓/๔๕๖/๗๘๙/๐๑๒๓",
    "ตรวจทะเบียนเลข 123\u00a0456\u2009789\u200b0123",
    "ตรวจทะเบียนเลข 123./456‐789 · 0123",
] as const;
