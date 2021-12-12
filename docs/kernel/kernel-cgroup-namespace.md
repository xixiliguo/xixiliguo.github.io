---
title: "cgroup与命名空间"
date: 2021-09-25T21:45:56+08:00
draft: false
---



``` bash
crash> cgroup_subsys_id
enum cgroup_subsys_id {
  cpuset_cgrp_id = 0
  cpu_cgrp_id = 1
  cpuacct_cgrp_id = 2
  io_cgrp_id = 3
  memory_cgrp_id = 4
  devices_cgrp_id = 5
  freezer_cgrp_id = 6
  net_cls_cgrp_id = 7
  perf_event_cgrp_id = 8
  net_prio_cgrp_id = 9
  hugetlb_cgrp_id = 10
  pids_cgrp_id = 11
  rdma_cgrp_id = 12
  CGROUP_SUBSYS_COUNT = 13
};
crash>
```



``` bash
crash> task_struct.pid,thread_pid ffff8b568ca017c0
  pid = 26387
  thread_pid = 0xffff8b5736016000
crash> p ((struct pid*)0xffff8b5736016000)->level
$19 = 1
crash> p ((struct pid*)0xffff8b5736016000)->numbers[0]
$20 = {
  nr = 26387,
  ns = 0xffffffff8ac58360
}
crash> p ((struct pid*)0xffff8b5736016000)->numbers[1]
$21 = {
  nr = 1,
  ns = 0xffff8b57533787c0
}
crash>
```