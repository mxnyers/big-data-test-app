UPDATE samples.bakehouse.media_gold_reviews_chunked
SET
  chunked_text = COALESCE(${chunked_text}, chunked_text),
  review_date = COALESCE(${review_date}, review_date),
  review_uri = COALESCE(${review_uri}, review_uri)
WHERE chunk_id = ${chunk_id};