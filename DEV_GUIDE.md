
## Database

Query to find any pessimistic locks any entity
```SQL
SELECT *
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT granted;
```

Query for a more readable output
```SQL
SELECT pid, state, query, wait_event_type, wait_event
FROM pg_stat_activity
WHERE datname = current_database();
```

To kill that Block
```SQL
SELECT pid, state, query, wait_event_type, wait_event
FROM pg_stat_activity
WHERE datname = current_database();
```