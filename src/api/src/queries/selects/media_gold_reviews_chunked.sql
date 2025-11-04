SELECT
  franchiseeID AS franchiseID,
  review_date,
  chunked_text,
  chunk_id,
  review_uri
FROM samples.bakehouse.media_gold_reviews_chunked
ORDER BY review_date DESC
LIMIT 250;