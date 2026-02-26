── Performance ──────────────────────────
┌─────────┬──────────────────┬──────────┐
│ (index) │ Metric           │ Value    │
├─────────┼──────────────────┼──────────┤
│ 0       │ 'Total Requests' │ 1000     │
│ 1       │ 'Succeeded'      │ 1000     │
│ 2       │ 'Failed'         │ 0        │
│ 3       │ 'Concurrency'    │ 40       │
│ 4       │ 'Average (ms)'   │ '798.53' │
│ 5       │ 'Median (ms)'    │ 672      │
│ 6       │ 'Fastest (ms)'   │ 13       │
│ 7       │ 'Slowest (ms)'   │ 4308     │
└─────────┴──────────────────┴──────────┘

── Replica Distribution ─────────────────
┌─────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Replica            │ Requests │ %       │
├─────────┼────────────────────┼──────────┼─────────┤
│ 0       │ '172.18.0.17:8009' │ 334      │ '33.4%' │
│ 1       │ '172.18.0.18:8009' │ 333      │ '33.3%' │
│ 2       │ '172.18.0.15:8009' │ 333      │ '33.3%' │
└─────────┴────────────────────┴──────────┴─────────┘
Total replicas that served traffic: 3

note this test only read from master , slave db not initialized properly yet