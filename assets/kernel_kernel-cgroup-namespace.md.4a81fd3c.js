import{_ as s,c as n,o as a,a as p}from"./app.526dca4e.js";const _=JSON.parse('{"title":"cgroup\u4E0E\u547D\u540D\u7A7A\u95F4","description":"","frontmatter":{"title":"cgroup\u4E0E\u547D\u540D\u7A7A\u95F4","date":"2021-09-25T13:45:56.000Z","draft":false},"headers":[],"relativePath":"kernel/kernel-cgroup-namespace.md","lastUpdated":1657810449000}'),l={name:"kernel/kernel-cgroup-namespace.md"},e=p(`<div class="language-bash"><span class="copy"></span><pre><code><span class="line"><span style="color:#A6ACCD;">crash</span><span style="color:#89DDFF;">&gt;</span><span style="color:#A6ACCD;"> cgroup_subsys_id</span></span>
<span class="line"><span style="color:#A6ACCD;">enum cgroup_subsys_id </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">  cpuset_cgrp_id = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">  cpu_cgrp_id = 1</span></span>
<span class="line"><span style="color:#A6ACCD;">  cpuacct_cgrp_id = 2</span></span>
<span class="line"><span style="color:#A6ACCD;">  io_cgrp_id = 3</span></span>
<span class="line"><span style="color:#A6ACCD;">  memory_cgrp_id = 4</span></span>
<span class="line"><span style="color:#A6ACCD;">  devices_cgrp_id = 5</span></span>
<span class="line"><span style="color:#A6ACCD;">  freezer_cgrp_id = 6</span></span>
<span class="line"><span style="color:#A6ACCD;">  net_cls_cgrp_id = 7</span></span>
<span class="line"><span style="color:#A6ACCD;">  perf_event_cgrp_id = 8</span></span>
<span class="line"><span style="color:#A6ACCD;">  net_prio_cgrp_id = 9</span></span>
<span class="line"><span style="color:#A6ACCD;">  hugetlb_cgrp_id = 10</span></span>
<span class="line"><span style="color:#A6ACCD;">  pids_cgrp_id = 11</span></span>
<span class="line"><span style="color:#A6ACCD;">  rdma_cgrp_id = 12</span></span>
<span class="line"><span style="color:#A6ACCD;">  CGROUP_SUBSYS_COUNT = 13</span></span>
<span class="line"><span style="color:#89DDFF;">};</span></span>
<span class="line"><span style="color:#A6ACCD;">crash</span><span style="color:#89DDFF;">&gt;</span></span>
<span class="line"></span></code></pre></div><div class="language-bash"><span class="copy"></span><pre><code><span class="line"><span style="color:#A6ACCD;">crash</span><span style="color:#89DDFF;">&gt;</span><span style="color:#A6ACCD;"> task_struct.pid,thread_pid ffff8b568ca017c0</span></span>
<span class="line"><span style="color:#A6ACCD;">  pid = 26387</span></span>
<span class="line"><span style="color:#A6ACCD;">  thread_pid = 0xffff8b5736016000</span></span>
<span class="line"><span style="color:#A6ACCD;">crash</span><span style="color:#89DDFF;">&gt;</span><span style="color:#A6ACCD;"> p </span><span style="color:#89DDFF;">((</span><span style="color:#C3E88D;">struct pid</span><span style="color:#89DDFF;">*</span><span style="color:#C3E88D;">)</span><span style="color:#F78C6C;">0xffff8b5736016000</span><span style="color:#C3E88D;">)</span><span style="color:#89DDFF;">-&gt;</span><span style="color:#C3E88D;">level</span></span>
<span class="line"><span style="color:#89DDFF;">$</span><span style="color:#A6ACCD;">1</span><span style="color:#F78C6C;">9</span><span style="color:#C3E88D;"> </span><span style="color:#89DDFF;">=</span><span style="color:#C3E88D;"> </span><span style="color:#F78C6C;">1</span></span>
<span class="line"><span style="color:#A6ACCD;">crash&gt; p ((struct pid*)0xffff8b5736016000)-&gt;numbers[0]</span></span>
<span class="line"><span style="color:#89DDFF;">$</span><span style="color:#A6ACCD;">20 = </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">  nr = 26387,</span></span>
<span class="line"><span style="color:#A6ACCD;">  ns = 0xffffffff8ac58360</span></span>
<span class="line"><span style="color:#89DDFF;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">crash</span><span style="color:#89DDFF;">&gt;</span><span style="color:#A6ACCD;"> p </span><span style="color:#89DDFF;">((</span><span style="color:#C3E88D;">struct pid</span><span style="color:#89DDFF;">*</span><span style="color:#C3E88D;">)</span><span style="color:#F78C6C;">0xffff8b5736016000</span><span style="color:#C3E88D;">)</span><span style="color:#89DDFF;">-&gt;</span><span style="color:#C3E88D;">numbers[</span><span style="color:#F78C6C;">1</span><span style="color:#C3E88D;">]</span></span>
<span class="line"><span style="color:#89DDFF;">$</span><span style="color:#A6ACCD;">2</span><span style="color:#F78C6C;">1</span><span style="color:#C3E88D;"> </span><span style="color:#89DDFF;">=</span><span style="color:#C3E88D;"> {</span></span>
<span class="line"><span style="color:#A6ACCD;">  nr = 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">  ns = 0xffff8b57533787c0</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">crash</span><span style="color:#89DDFF;">&gt;</span></span>
<span class="line"></span></code></pre></div>`,2),o=[e];function c(r,t,C,D,y,i){return a(),n("div",null,o)}var d=s(l,[["render",c]]);export{_ as __pageData,d as default};
