# Academy tenant isolation from the start

The product will be multi-tenant by academy from the beginning, even though each V0 instructor account manages only one academy. This makes academy-level data isolation a first-class design constraint and avoids the security and migration risk of retrofitting tenant boundaries after multiple academies are already using the system.
