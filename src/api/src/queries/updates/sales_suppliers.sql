UPDATE samples.bakehouse.sales_suppliers
SET
  name = COALESCE(${name}, name),
  ingredient = COALESCE(${ingredient}, ingredient),
  continent = COALESCE(${continent}, continent),
  city = COALESCE(${city}, city),
  district = COALESCE(${district}, district),
  size = COALESCE(${size}, size),
  longitude = COALESCE(${longitude}, longitude),
  latitude = COALESCE(${latitude}, latitude),
  approved = COALESCE(${approved}, approved)
WHERE supplierID = ${supplierID};