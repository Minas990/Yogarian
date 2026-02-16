# Load Test for Cleanup Job

## Setup

1. **Disable throttling on signup** 
2. **Disable 12-hour filter**

## Run the Load Test

```powershell
node scripts/load-test-signup.js
```

This will create **10,000 unconfirmed users** with emails like `testuser0@loadtest.com` to `testuser9999@loadtest.com`.


### Keep Ur Eyes on: 
-  signup rate (requests/second)
- Check for any failed requests

### During Cleanup Job:
The cleanup job runs every **2 minutes** and processes **100 users per batch**.

**Expected behavior:**
- Each run deletes 500 users (oldest first)
- After 10,000 users created, it takes some minutes to clear all
- Monitor PostgreSQL for index usage: `EXPLAIN ANALYZE` should show `Index Scan using idx_auth_user_cleanup`

### To Watch Cleanup in Real-Time:

```powershell
docker exec -it yoga-postgres-auth psql -U auth -d auth -c "SELECT COUNT(*) FROM auth_user WHERE \"isEmailConfirmed\" = false;"

docker exec -it yoga-postgres-auth psql -U auth -d auth -c "EXPLAIN ANALYZE SELECT * FROM auth_user WHERE \"isEmailConfirmed\" = false ORDER BY \"createdAt\" ASC LIMIT 100;"
```

## Metrics to Collect

1. **Signup phase:**
   - Total time to create 10k users
   - Average requests/second
   - Success rate

2. **Cleanup phase:**
   - Time per cleanup batch (should be <1 second with index)
   - Query execution time (check EXPLAIN ANALYZE)
   - Memory usage
   - CPU usage

3. **Database:**
   - Check if index is being used
   - Table scan vs index scan
   - Connection pool saturation

## Expected Results

✅ **Good performance:**
- Index scan (not seq scan) ->  not always truee
- Cleanup batch in <500ms
- No database locks
- Steady deletion rate

