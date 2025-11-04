UPDATE samples.bakehouse.media_customer_reviews
SET
  review = COALESCE(${review}, review),
  franchiseID = COALESCE(${franchiseID}, franchiseID),
  review_date = COALESCE(${review_date}, review_date),
  new_id = COALESCE(${new_id}, new_id)
WHERE new_id = ${new_id};