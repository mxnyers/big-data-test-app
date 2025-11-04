UPDATE samples.bakehouse.sales_franchises
SET
  name = COALESCE(${name}, name),
  city = COALESCE(${city}, city),
  district = COALESCE(${district}, district),
  zipcode = COALESCE(${zipcode}, zipcode),
  country = COALESCE(${country}, country),
  size = COALESCE(${size}, size),
  longitude = COALESCE(${longitude}, longitude),
  latitude = COALESCE(${latitude}, latitude),
  supplierID = COALESCE(${supplierID}, supplierID)
WHERE franchiseID = ${franchiseID};