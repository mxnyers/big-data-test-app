INSERT INTO samples.bakehouse.media_gold_reviews_chunked
(
  franchiseeID,
  review_date,
  chunked_text,
  chunk_id,
  review_uri
)
VALUES
(
  ${franchiseeID},
  COALESCE(${review_date}, CURRENT_TIMESTAMP()),
  ${chunked_text},
  ${chunk_id},
  ${review_uri}
);