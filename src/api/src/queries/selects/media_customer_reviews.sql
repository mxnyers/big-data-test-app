SELECT
  review,
  franchiseID,
  review_date,
  new_id
FROM samples.bakehouse.media_customer_reviews
ORDER BY review_date DESC
LIMIT 250;