SELECT
  franchiseID,
  name,
  city,
  district,
  zipcode,
  country,
  size,
  longitude,
  latitude,
  supplierID
FROM samples.bakehouse.sales_franchises
ORDER BY franchiseID
LIMIT 250;