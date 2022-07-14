import{_ as s,c as t,o as l,a}from"./app.526dca4e.js";var e="/img/atop.png";const C=JSON.parse('{"title":"ATOP\u5DE5\u4F5C\u539F\u7406\u603B\u7ED3","description":"","frontmatter":{"title":"ATOP\u5DE5\u4F5C\u539F\u7406\u603B\u7ED3"},"headers":[{"level":2,"title":"\u8FD0\u884C\u65B9\u5F0F","slug":"\u8FD0\u884C\u65B9\u5F0F"},{"level":2,"title":"\u539F\u59CB\u4FE1\u606F\u6536\u96C6","slug":"\u539F\u59CB\u4FE1\u606F\u6536\u96C6"},{"level":2,"title":"CPU","slug":"cpu"},{"level":2,"title":"Memory Swap","slug":"memory-swap"},{"level":2,"title":"Disk","slug":"disk"},{"level":2,"title":"Network","slug":"network"}],"relativePath":"linux/atop.md","lastUpdated":1657810449000}'),o={name:"linux/atop.md"},n=a('<h1 id="atop\u5DE5\u4F5C\u539F\u7406\u603B\u7ED3" tabindex="-1">ATOP\u5DE5\u4F5C\u539F\u7406\u603B\u7ED3 <a class="header-anchor" href="#atop\u5DE5\u4F5C\u539F\u7406\u603B\u7ED3" aria-hidden="true">#</a></h1><p>ATOP\u662F\u4E00\u6B3E\u7528\u4E8E\u89C2\u5BDFLinux\u6027\u80FD\u7684ASCII\u5168\u5C4F\u4EA4\u4E92\u5F0F\u5DE5\u5177\u3002\u7C7B\u4F3C\u4E8Etop,\u6BCF\u9694\u4E00\u6BB5\u65F6\u95F4\u62A5\u544A <code>CPU\uFF0CMemory\uFF0CDisk\uFF0CNetwork</code> \u7B49\u786C\u4EF6\u7684\u6027\u80FD\u4FE1\u606F\uFF0C\u5BF9\u4E8E\u4E25\u91CD\u8FC7\u8F7D\u7684\u8D44\u6E90\u4F1A\u9AD8\u4EAE\u663E\u793A\u3002 \u9664\u6B64\u4E4B\u5916\uFF0C\u8FD8\u5305\u62EC\u8FDB\u7A0B\u7EA7\u7684\u76F8\u5173\u7EDF\u8BA1\u4FE1\u606F\u3002\u6BD4\u5982\u8FDB\u7A0B\u7684CPU\u3001\u5185\u5B58\u3001\u78C1\u76D8\u5229\u7528\u7387\uFF0C\u7528\u6237\u540D\uFF0C\u8FDB\u7A0B\u72B6\u6001\uFF0C\u542F\u52A8\u65F6\u95F4\uFF0C\u8FDB\u7A0BID\u7B49\u3002\u5BF9\u4E8E\u5728\u4E0A\u4E00\u4E2A\u5468\u671F\u5185\u9000\u51FA\u7684\u8FDB\u7A0B\u8FD8\u4F1A\u663E\u793A\u9000\u51FA\u72B6\u6001\u7801\u3002\u6240\u6709\u8FDB\u7A0B\u4FE1\u606F\u9ED8\u8BA4\u6309CPU\u5360\u7528\u7387\u964D\u5E8F\u6392\u5217\u3002</p><h2 id="\u8FD0\u884C\u65B9\u5F0F" tabindex="-1">\u8FD0\u884C\u65B9\u5F0F <a class="header-anchor" href="#\u8FD0\u884C\u65B9\u5F0F" aria-hidden="true">#</a></h2><p><code>atop 3</code>\u53EF\u4EE5\u6309\u6BCF3\u79D2\u5237\u65B0\u4E00\u6B21\u7684\u9891\u7387\u5728ASCII\u5C4F\u5E55\u4E0A\u663E\u793A\u5373\u65F6\u6027\u80FD\u4FE1\u606F\uFF0C\u7ED3\u679C\u5982\u4E0B\u56FE\u3002 \u53EF\u4EE5\u5B9E\u65F6\u4E86\u89E3\u5F53\u524D\u7CFB\u7EDF\u7684\u8D1F\u8F7D\u60C5\u51B5\uFF0C\u540C\u65F6\u5177\u6709\u5F88\u5F3A\u7684\u4EA4\u4E92\u6027\u3002\u6BD4\u5982\u6309\u952E\u76D8\u4E0A\u7684<code>c</code>\u53EF\u663E\u793A\u8FD0\u884C\u8FDB\u7A0B\u7684\u5B8C\u6574\u540D\u79F0\uFF08\u5305\u62EC\u53C2\u6570\uFF09\u3002\u6309\u952E<code>m</code>\u53EF\u4EE5\u6309\u5185\u5B58\u5229\u7528\u7387\u964D\u5E8F\u6392\u5E8F\u5F53\u524D\u8FDB\u7A0B\u5217\u8868\uFF0C\u79F0\u4E4B\u4E3A\u5185\u5B58\u89C6\u56FE\u3002 <img src="'+e+`" alt="abc"></p><p><code>atop -a -w /var/log/atop/atop_{HOSTNAME}_20151123 30</code>\u5219\u6BCF30\u79D2\u8BB0\u5F55\u4E00\u6B21\u6570\u636E\u5E76\u6301\u4E45\u5316\u5230atop_{HOSTNAME}_20151123\u6587\u4EF6\u91CC\u3002\u8FD9\u6837\u7684\u547D\u4EE4\u901A\u5E38\u88AB\u5B9A\u65F6\u4EFB\u52A1\u62C9\u8D77\u3002\u5F53\u670D\u52A1\u5668\u5728\u7279\u5B9A\u65F6\u95F4\u70B9\u51FA\u73B0\u5F02\u5E38\u6216\u8005\u60F3\u8981\u67E5\u770B\u8FD1\u51E0\u5929\u5185\u7684\u6027\u80FD\u4FE1\u606F\u65F6\uFF0C\u5C31\u53EF\u4EE5\u4F7F\u7528<code>atop -r FileName</code>\u8BFB\u53D6\u6587\u4EF6\u5E76\u67E5\u770B\u91CC\u9762\u7684\u6027\u80FD\u6570\u636E\u3002\u8FD9\u91CC\u5217\u51FA\u6587\u4EF6\u7684\u4E00\u4E9B\u9ED8\u8BA4\u8BBE\u7F6E</p><ul><li>\u6027\u80FD\u6536\u96C6\u65F6\u95F4\u95F4\u9694\uFF1A30s</li><li>\u6587\u4EF6\u540D\uFF1Aatop_HOSTNAME_CURDAY</li><li>\u6587\u4EF6\u4FDD\u5B58\u5929\u6570\uFF1A7days</li><li>\u6587\u4EF6\u4FDD\u5B58\u76EE\u5F55\uFF1A/var/log/atop</li><li>\u6267\u884CATOP\u7684\u5B9A\u65F6\u4EFB\u52A1\u811A\u672C\uFF1A/etc/cron.d/atop</li></ul><p>\u5B89\u88C5atop\u540E\u4E3B\u673A\u4E0A\u6BCF\u5929\u90FD\u4F1A\u4EA7\u751F\u5BF9\u5E94\u7684atop\u6587\u4EF6\uFF0C\u4F46\u6211\u4EEC\u6267\u884C<code>crontab -l</code>\u5374\u627E\u4E0D\u5230\u4E0Eatop\u76F8\u5173\u7684\u5B9A\u65F6\u4EFB\u52A1\uFF0C\u5176\u5B9E\u5B83\u5728/etc/cron.d\u4E0B\u9762\u3002</p><blockquote><p>AAA:~ # cat /etc/cron.d/atop<br> 0 0 * * * root /etc/atop/atop.daily</p></blockquote><p>cron\u8FDB\u7A0B\u5148\u5728<code>/var/spool/cron/tabs</code>\u76EE\u5F55\u4E0B\u641C\u7D22\u4EE5\u7528\u6237\u540D\u547D\u540D\u7684\u6587\u4EF6\uFF0C\u627E\u5230\u5C31\u8BFB\u5230\u5185\u5B58\u4E2D\uFF0C\u5176\u5185\u5BB9\u5C31\u662F<code>crontab -l</code>\u7684\u8F93\u51FA\u3002\u63A5\u7740\u7EE7\u7EED\u641C\u7D22<code>/etc/crontab</code>\u548C <code>/etc/cron.d</code>\u76EE\u5F55\u4E0B\u7684\u6240\u6709\u6587\u4EF6\u5E76\u8BFB\u53D6\u4E4B\u3002\u5176\u683C\u5F0F\u548C<code>tabs</code>\u4E0B\u7684\u7565\u6709\u4E0D\u540C\uFF0C\u4E3B\u8981\u533A\u522B\u662F\u6307\u5B9A\u4E86\u811A\u672C\u7684\u6267\u884C\u7528\u6237\u3002</p><h2 id="\u539F\u59CB\u4FE1\u606F\u6536\u96C6" tabindex="-1">\u539F\u59CB\u4FE1\u606F\u6536\u96C6 <a class="header-anchor" href="#\u539F\u59CB\u4FE1\u606F\u6536\u96C6" aria-hidden="true">#</a></h2><p><code>/proc</code>\u662FLinux\u4E0B\u4E00\u79CD\u865A\u62DF\u6587\u4EF6\u7CFB\u7EDF\uFF0C\u5B58\u50A8\u7684\u662F\u5F53\u524D\u5185\u6838\u8FD0\u884C\u72B6\u6001\u7684\u4E00\u7CFB\u5217\u7279\u6B8A\u6587\u4EF6\uFF0C\u7528\u6237\u53EF\u4EE5\u901A\u8FC7\u67E5\u770B\u8FD9\u4E9B\u6587\u4EF6\u4E86\u89E3\u7CFB\u7EDF\u786C\u4EF6\u53CA\u5F53\u524D\u6B63\u5728\u8FD0\u884C\u8FDB\u7A0B\u7684\u4FE1\u606F\u3002ATOP\u6B63\u662F\u4ECE<code>/proc</code>\u4E0B\u5404\u79CD\u6587\u4EF6\u4E2D\u8BFB\u53D6\u539F\u59CB\u4FE1\u606F\uFF0C\u901A\u8FC7\u91C7\u6837\u6765\u8BA1\u7B97\u5468\u671F\u5185\u7684\u5373\u65F6\u6570\u636E\u3002\u6BD4\u5982A\u65F6\u95F4\u70B9\u8BB0\u5F55\u4E0B\u6D88\u8017\u5728\u7528\u6237\u6001\u7684cpu\u65F6\u95F4\u548C\u603B\u7684CPU\u65F6\u95F4\u4E3A<code>M</code>\uFF0C<code>X</code>\u3002\u5728B\u65F6\u95F4\u70B9\u8BB0\u5F55\u4E0B\u6B64\u4E24\u9879\u5BF9\u5E94\u7684\u503C\u4E3A<code>N</code>\uFF0C<code>Y</code>\u3002\u5219\u5F53\u524D\u7684\u7528\u6237\u6001CPU\u4F7F\u7528\u7387\u4E3A<code>(N-M)/(Y-X)</code>\u3002\u7B49\u6240\u6709\u7684\u6027\u80FD\u4FE1\u606F\u90FD\u8BA1\u7B97\u52A0\u5DE5\u5B8C\u6BD5\u540E,\u4F7F\u7528libncurses\u5E93\u63D0\u4F9B\u7684\u51FD\u6570\u5C06\u6700\u7EC8\u4FE1\u606F\u6253\u5370\u5728\u5B57\u7B26\u754C\u9762\u4E0A\u3002</p><p><code>/proc</code>\u91CC\u8BB0\u5F55\u7684\u7EDF\u8BA1\u4FE1\u606F\uFF08\u9664\u5185\u5B58\uFF09\u90FD\u662F\u81EA\u8BBE\u5907\u542F\u52A8\u4EE5\u6765\u6216\u8005\u8FDB\u7A0B\u542F\u52A8\u4EE5\u6765\u7684\u7D2F\u79EF\u503C\u3002\u5982\u679C\u6CA1\u5177\u4F53\u8BF4\u660E\uFF0C\u5219\u672C\u6587\u6240\u8BB2\u5230\u7684\u5404\u5B57\u6BB5\u7684\u503C\u9ED8\u8BA4\u90FD\u662F\u5DEE\u503C,\u5373\u5F53\u524D\u65F6\u95F4\u70B9\u91C7\u6837\u503C\u51CF\u53BB\u5148\u524D\u65F6\u95F4\u70B9\u7684\u91C7\u6837\u503C.</p><p>\u672C\u6587\u6240\u6709\u793A\u4F8B\u5728<code>Suse11</code>\u73AF\u5883\u4E0B\u901A\u8FC7\uFF0Catop\u7248\u672C\u4E3A<code>1.27</code>\u3002\u793A\u4F8B\u4E2D\u6570\u636E\u4EC5\u4E3A\u8BF4\u660E\uFF0C\u4E00\u4E9B\u5F71\u54CD\u9605\u8BFB\u4E14\u4E0E\u672C\u6587\u65E0\u5173\u7684\u5185\u5BB9\u4F1A\u5220\u9664\u3002\u5982\u679C\u60F3\u8981\u5168\u9762\u4E86\u89E3/proc\u6587\u4EF6\u7CFB\u7EDF\u91CC\u6587\u4EF6\u542B\u4E49\uFF0C\u53EF\u4EE5<code>man 5 proc</code></p><h2 id="cpu" tabindex="-1">CPU <a class="header-anchor" href="#cpu" aria-hidden="true">#</a></h2><p>\u8BFB\u53D6<code>/proc/stat</code>\u83B7\u53D6CPU\u7684\u7EDF\u8BA1\u4FE1\u606F\uFF0C\u5305\u62EC\u6BCF\u4E2ACPU\u548C\u603B\u7684CPU\u4FE1\u606F\u3002</p><blockquote><p>AAA:~ # cat /proc/stat<br> cpu 3870117 23378 3233296 139792496 2051527 159950 29648 0 0<br> cpu0 1903376 11614 1577768 70138672 1000644 81353 12021 0 0<br> cpu1 1966740 11763 1655527 69653824 1050882 78597 17626 0 0<br> ....<br> btime 1447557115<br> processes 3543228<br> procs_running 1<br> procs_blocked 0</p></blockquote><p>cpuN\u884C\u540E\u9762\u7684\u6570\u503C\u542B\u4E49\u4ECE\u5DE6\u5230\u53F3\u5206\u522B\u662F\uFF1Auser\uFF0Cnice\uFF0Csystem\uFF0Cidle\uFF0Ciowait\uFF0Cirq\uFF0Csoftirq\uFF0Csteal\uFF0Cguest\u3002\u5355\u4F4D\u4E3Ajiffies\uFF0C\u8BE5\u503C\u7B49\u4E8E<code>1/hertz</code>\u79D2\u3002<code>hertz</code>\u5728\u5927\u90E8\u5206\u7CFB\u7EDF\u91CC\u4E3A100\u3002\u53EF\u4EE5\u7528\u5982\u4E0B\u547D\u4EE4\u67E5\u8BE2\uFF1A</p><blockquote><p>AAA:~ # getconf -a | grep TCK<br> CLK_TCK 100</p></blockquote><p>\u90A3\u4E48\u5F53\u524D\u6BCF\u4E2ACPU\u7684\u5229\u7528\u7387\u4E3A\uFF1A<code>CPU usage = (total - idle - iowait) / total</code> <code>total</code>\u4E3AcpuN\u8FD9\u4E00\u884C\u6240\u6709\u503C\u4E4B\u548C.</p><p>\u987A\u4FBF\u4ECB\u7ECD\u4E0B\u5176\u4ED6\u51E0\u4E2A\u6BD4\u8F83\u6709\u7528\u7684\u5B57\u6BB5\u542B\u4E49\uFF1A</p><ul><li>btime\uFF1A\u8BB0\u5F55\u7CFB\u7EDF\u5F00\u673A\u542F\u52A8\u65F6\u8DDD1970\u5E741\u67081\u53F7\u591A\u5C11\u79D2</li><li>processes (total_forks)\uFF1A\u81EA\u7CFB\u7EDF\u542F\u52A8\u4EE5\u6765\u6240\u521B\u5EFA\u7684\u4EFB\u52A1\u7684\u6570\u76EE</li><li>procs_running\uFF1A\u5F53\u524D\u5904\u4E8E\u8FD0\u884C\u961F\u5217\u7684\u8FDB\u7A0B\u6570</li><li>procs_blocked\uFF1A\u5F53\u524D\u88AB\u963B\u585E\u7684\u8FDB\u7A0B\u6570</li></ul><h2 id="memory-swap" tabindex="-1">Memory Swap <a class="header-anchor" href="#memory-swap" aria-hidden="true">#</a></h2><p>\u8BFB\u53D6<code>/proc/meminfo</code>\u83B7\u53D6\u5185\u5B58\u7EDF\u8BA1\u4FE1\u606F\uFF0C\u8BFB\u53D6<code>/proc/vmstat</code>\u83B7\u53D6\u9875\u4EA4\u6362\u4FE1\u606F\u3002 \u5728\u9AD8\u8D1F\u8377\u7684\u670D\u52A1\u5668\u91CC\u5F53\u5185\u5B58\u4E0D\u591F\u7528\u65F6\uFF0COS\u4F1A\u5C06\u672C\u5E94\u5199\u5165\u5185\u5B58\u7684\u6570\u636E\u5199\u5165\u5230Swap\u7A7A\u95F4\uFF0C\u7B49\u5185\u5B58\u5145\u8DB3\u65F6\u518D\u5C06SWAP\u5185\u7684\u6570\u636E\u4EA4\u6362\u5230\u5185\u5728\u91CC\u3002\u5185\u5B58\u548CSwap \u7684\u8FD9\u79CD\u4EA4\u6362\u8FC7\u7A0B\u79F0\u4E3A\u9875\u9762\u4EA4\u6362\uFF08Paging\uFF09\uFF0C\u5355\u4F4D\u4E3A\u9875\uFF0C\u5927\u5C0F\u662F4K\u3002 \u5728PAGE\u8FD9\u884C <code>swout</code>\u5B57\u6BB5\u663E\u793A\u4E00\u79D2\u4E2D\u6709\u591A\u5C11\u9875\u5199\u5165Swap\u3002\u5982\u679C\u8FD9\u4E2A\u503C\u8D85\u8FC710\uFF0C\u5219\u5185\u5B58\u8D44\u6E90\u4F1A\u7EA2\u8272\u9AD8\u4EAE\u663E\u793A\u3002\u53EA\u8981\u8BE5\u503C<code>11 &lt;= X &lt; 10</code>\uFF0C\u5219\u8868\u660E\u5F53\u524D\u7269\u7406\u5185\u5B58\u5DF2\u7ECF\u4E0D\u8DB3\uFF0C\u6709\u9875\u4EA4\u6362\u64CD\u4F5C\u3002ATOP\u4F1A\u4EE5\u9752\u7070\u8272\u9AD8\u4EAE\u5185\u5B58\u8D44\u6E90\uFF0C\u8868\u793A\u5DF2\u7ECF\u51FA\u73B0\u74F6\u9888\u4F46\u4E0D\u662F\u7279\u522B\u4E25\u91CD\u3002</p><ul><li>\u8BA1\u7B97\u516C\u5F0F\u4E3A\uFF1A <code>swouts / nsecs</code></li><li>swouts \u4ECE <code>/proc/vmstat</code> \u7684 <code>pswpout</code>\u5B57\u6BB5\u83B7\u5F97</li><li>nescs\u4E3A\u91C7\u6837\u7684\u65F6\u95F4\u95F4\u9694</li></ul><p>\u7CFB\u7EDF\u81EA\u5E26\u7684<code>vmstat</code>\u547D\u4EE4\u4E5F\u53EF\u4EE5\u89C2\u5BDF\u5230<code>SWAP</code>\u7684\u4EA4\u6362\u60C5\u51B5\uFF0C\u5B83\u6B63\u662F\u901A\u8FC7\u8BFB\u53D6<code>/proc/vmstat</code>\u6765\u83B7\u53D6\u9875\u4EA4\u6362\u4FE1\u606F\u7684</p><blockquote><p>AAA:~ # strace -ftT -e trace=open vmstat &gt;/dev/null<br> 09:36:16 open(&quot;/etc/ld.so.cache&quot;, O_RDONLY) = 3 &lt;0.000015&gt;<br> 09:36:16 open(&quot;/lib64/libc.so.6&quot;, O_RDONLY) = 3 &lt;0.000014&gt;<br> 09:36:16 open(&quot;/proc/meminfo&quot;, O_RDONLY) = 3 &lt;0.000027&gt;<br> 09:36:16 open(&quot;/proc/stat&quot;, O_RDONLY) = 4 &lt;0.000018&gt;<br> 09:36:16 open(&quot;/proc/vmstat&quot;, O_RDONLY) = 5 &lt;0.000018&gt;</p><p>AAA:~ # cat /proc/meminfo<br> MemTotal: 7669188 kB<br> MemFree: 1909052 kB<br> Buffers: 424088 kB<br> Cached: 3670052 kB<br> ....<br> SwapCached: 0 kB<br> SwapTotal: 8393920 kB<br> SwapFree: 8393920 kB<br> Mapped: 681904 kB<br> ....<br> Shmem: 736624 kB<br> Slab: 178552 kB<br> SReclaimable: 139164 kB</p></blockquote><p>\u4E0A\u8FF0meminfo\u6587\u4EF6\u5B57\u6BB5\u89E3\u91CA\uFF1A</p><ul><li>MemTotal\uFF1A\u6240\u6709\u53EF\u7528RAM\u5927\u5C0F\uFF08\u5373\u7269\u7406\u5185\u5B58\u51CF\u53BB\u4E00\u4E9B\u9884\u7559\u4F4D\u548C\u5185\u6838\u7684\u4E8C\u8FDB\u5236\u4EE3\u7801\u5927\u5C0F\uFF09</li><li>MemFree\uFF1A\u88AB\u7CFB\u7EDF\u7559\u7740\u672A\u4F7F\u7528\u7684\u5185\u5B58</li><li>Buffers\uFF1A\u7528\u6765\u7ED9\u6587\u4EF6\u505A\u7F13\u51B2\u5927\u5C0F</li><li>Cached\uFF1A\u88AB\u9AD8\u901F\u7F13\u51B2\u5B58\u50A8\u5668\uFF08cache memory\uFF09\u7528\u7684\u5185\u5B58\u7684\u5927\u5C0F</li><li>SwapTotal: \u4EA4\u6362\u7A7A\u95F4\u7684\u603B\u5927\u5C0F</li><li>SwapFree: \u672A\u88AB\u4F7F\u7528\u4EA4\u6362\u7A7A\u95F4\u7684\u5927\u5C0F</li><li>Slab: \u5185\u6838\u6570\u636E\u7ED3\u6784\u7F13\u5B58\u7684\u5927\u5C0F\uFF0C\u53EF\u4EE5\u51CF\u5C11\u7533\u8BF7\u548C\u91CA\u653E\u5185\u5B58\u5E26\u6765\u7684\u6D88\u8017\u3002</li><li>SReclaimable:\u53EF\u6536\u56DESlab\u7684\u5927\u5C0F</li><li>Shmem: \u5171\u4EAB\u5185\u5B58\u5927\u5C0F</li></ul><p>\u5185\u5B58\u5229\u7528\u7387\u7684\u516C\u5F0F\u4E3A\uFF1A<code>(MemTotal - MemFree - Cached - Buffers) / MemTotal</code>. Shmem\u8FD9\u90E8\u5206\u5185\u5B58\u662F\u5305\u542B\u5728Cache\u91CC\u7684\uFF0C\u5176\u5B9E\u5B83\u662F\u65E0\u6CD5\u88AB\u56DE\u6536\u7684\u3002 \u6240\u4EE5\u4ECEATOP2.0\u7248\u672C\u5F00\u59CB\uFF0C\u8BE5\u5229\u7528\u7528\u7387\u516C\u5F0F\u53D8\u4E3A\uFF1A<code>(MemTotal - MemFree - Cached - Buffers +\u3000Shmem) / MemTotal</code> . \u8FD9\u4E2A\u7ED3\u679C\u5DF2\u7ECF\u975E\u5E38\u51C6\u786E\u4E86\u3002</p><p>Swap\u5229\u7528\u7387\u516C\u5F0F\u4E3A\uFF1A<code>(SwapTotal - SwapFree) / SwapTotal</code></p><h2 id="disk" tabindex="-1">Disk <a class="header-anchor" href="#disk" aria-hidden="true">#</a></h2><p>\u8BFB\u53D6/proc/diskstats\u83B7\u53D6\u78C1\u76D8\u4FE1\u606F\u3002\u4ECE\u5DE6\u81F3\u53F3\u5206\u522B\u5BF9\u5E94\u4E3B\u8BBE\u5907\u53F7\uFF0C\u6B21\u8BBE\u5907\u53F7\u548C\u8BBE\u5907\u540D\u79F0\u3002\u540E\u7EED\u768411\u4E2A\u5217\u89E3\u91CA\u5982\u4E0B\uFF0C\u9664\u4E86\u7B2C9\u4E2A\u5217\u5916\u6240\u6709\u7684\u5217\u90FD\u662F\u4ECE\u542F\u52A8\u65F6\u7684\u7D2F\u79EF\u503C\u3002</p><div class="language-"><span class="copy"></span><pre><code><span class="line"><span style="color:#A6ACCD;">AAA:~ # cat /proc/diskstats </span></span>
<span class="line"><span style="color:#A6ACCD;">    8       0 sda 139119 267262 3848795 1357456 3942149 4733328 62031044 62148876 0 36083024 63502552</span></span>
<span class="line"><span style="color:#A6ACCD;">    8       1 sda1 27 415 1388 472 0 0 0 0 0 452 472</span></span>
<span class="line"><span style="color:#A6ACCD;">    8       2 sda2 83999 87253 1992917 588124 883514 1359683 17920106 16570224 0 6728052 17157604</span></span>
<span class="line"><span style="color:#A6ACCD;">    8       3 sda3 4 0 14 84 0 0 0 0 0 84 84</span></span>
<span class="line"><span style="color:#A6ACCD;">    8       5 sda5 49767 174838 1493156 706492 1414495 2617855 32228098 19276908 0 14162008 19981604</span></span>
<span class="line"><span style="color:#A6ACCD;">    8       6 sda6 5257 4121 359986 60828 726761 755790 11882840 13347236 0 6084640 13407536</span></span>
<span class="line"><span style="color:#A6ACCD;">    8       7 sda7 20 194 428 508 0 0 0 0 0 496 508</span></span>
<span class="line"><span style="color:#A6ACCD;">    8       8 sda8 21 405 426 604 0 0 0 0 0 400 604</span></span>
<span class="line"><span style="color:#A6ACCD;">    7       0 loop0 0 0 0 0 0 0 0 0 0 0 0</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span></code></pre></div><ul><li>\u7B2C1\u5217\uFF1A\u8BFB\u78C1\u76D8\u7684\u6B21\u6570\uFF0C\u6210\u529F\u5B8C\u6210\u8BFB\u7684\u603B\u6B21\u6570\u3002</li><li>\u7B2C2\u5217\uFF1A\u5408\u5E76\u8BFB\u6B21\u6570\uFF0C\u4E3A\u4E86\u6548\u7387\u53EF\u80FD\u4F1A\u5408\u5E76\u76F8\u90BB\u7684\u8BFB\u548C\u5199\u3002\u4ECE\u800C\u4E24\u6B214K\u7684\u8BFB\u5728\u5B83\u6700\u7EC8\u88AB\u5904\u7406\u5230\u78C1\u76D8\u4E0A\u4E4B\u524D\u53EF\u80FD\u4F1A\u53D8\u6210\u4E00\u6B218K\u7684\u8BFB\uFF0C\u624D\u88AB\u8BA1\u6570\uFF08\u548C\u6392\u961F\uFF09\uFF0C\u56E0\u6B64\u53EA\u6709\u4E00\u6B21I/O\u64CD\u4F5C\u3002\u8FD9\u4E2A\u57DF\u4F7F\u4F60\u77E5\u9053\u8FD9\u6837\u7684\u64CD\u4F5C\u6709\u591A\u9891\u7E41\u3002</li><li>\u7B2C3\u5217\uFF1A\u8BFB\u6247\u533A\u7684\u6B21\u6570\uFF0C\u6210\u529F\u8BFB\u8FC7\u7684\u6247\u533A\u603B\u6B21\u6570\u3002</li><li>\u7B2C4\u5217\uFF1A\u8BFB\u82B1\u8D39\u7684\u6BEB\u79D2\u6570\uFF0C\u8FD9\u662F\u6240\u6709\u8BFB\u64CD\u4F5C\u6240\u82B1\u8D39\u7684\u6BEB\u79D2\u6570\uFF08\u7528__make_request()\u5230end_that_request_last()\u6D4B\u91CF\uFF09\u3002</li><li>\u7B2C5\u5217\uFF1A\u5199\u5B8C\u6210\u7684\u6B21\u6570\uFF0C\u6210\u529F\u5199\u5B8C\u6210\u7684\u603B\u6B21\u6570\u3002</li><li>\u7B2C6\u5217\uFF1A\u5408\u5E76\u5199\u6B21\u6570</li><li>\u7B2C7\u5217\uFF1A\u5199\u6247\u533A\u7684\u6B21\u6570\uFF0C\u6210\u529F\u5199\u6247\u533A\u603B\u6B21\u6570\u3002</li><li>\u7B2C8\u5217\uFF1A\u5199\u82B1\u8D39\u7684\u6BEB\u79D2\u6570\uFF0C\u8FD9\u662F\u6240\u6709\u5199\u64CD\u4F5C\u6240\u82B1\u8D39\u7684\u6BEB\u79D2\u6570\uFF08\u7528__make_request()\u5230end_that_request_last()\u6D4B\u91CF\uFF09\u3002</li><li>\u7B2C9\u5217\uFF1AI/O\u7684\u5F53\u524D\u8FDB\u5EA6\uFF0C\u53EA\u6709\u8FD9\u4E2A\u57DF\u5E94\u8BE5\u662F0\u3002\u5F53\u8BF7\u6C42\u88AB\u4EA4\u7ED9\u9002\u5F53\u7684request_queue_t\u65F6\u589E\u52A0\u548C\u8BF7\u6C42\u5B8C\u6210\u65F6\u51CF\u5C0F\u3002</li><li>\u7B2C10\u5217\uFF1A\u82B1\u5728I/O\u64CD\u4F5C\u4E0A\u7684\u6BEB\u79D2\u6570\uFF0C\u8FD9\u4E2A\u57DF\u4F1A\u589E\u957F\u53EA\u8981field 9\u4E0D\u4E3A0\u3002</li><li>\u7B2C11\u5217\uFF1A\u52A0\u6743\uFF0C \u82B1\u5728I/O\u64CD\u4F5C\u4E0A\u7684\u6BEB\u79D2\u6570\uFF0C\u5728\u6BCF\u6B21I/O\u5F00\u59CB\uFF0CI/O\u7ED3\u675F\uFF0CI/O\u5408\u5E76\u65F6\u8FD9\u4E2A\u57DF\u90FD\u4F1A\u589E\u52A0\u3002\u8FD9\u53EF\u4EE5\u7ED9I/O\u5B8C\u6210\u65F6\u95F4\u548C\u5B58\u50A8\u90A3\u4E9B\u53EF\u4EE5\u7D2F\u79EF\u7684\u63D0\u4F9B\u4E00\u4E2A\u4FBF\u5229\u7684\u6D4B\u91CF\u6807\u51C6\u3002</li></ul><p>\u4E0B\u9762\u8868\u683C\u5217\u51FA\u5E38\u7528\u5B57\u6BB5\u7684\u8BA1\u7B97\u65B9\u6CD5\uFF0C\u8868\u4E2D\u7684<code>\u7B2CX\u5217</code>\u662F\u6307<code>/proc/diskstats</code>\u6587\u4EF6\u91CC\u7684\u5BF9\u5E94\u5217\u7684\u5DEE\u503C\uFF08\u5373\u4E24\u6B21\u91C7\u6837\u70B9\u6240\u5F97\u503C\u7684\u5DEE\u503C\uFF09</p><table><thead><tr><th style="text-align:left;">ATOP\u5B57\u6BB5</th><th style="text-align:left;">\u542B\u4E49</th><th style="text-align:left;">\u8BA1\u7B97\u516C\u5F0F</th><th style="text-align:left;">\u5355\u4F4D</th></tr></thead><tbody><tr><td style="text-align:left;">MBr/s</td><td style="text-align:left;">\u5E73\u5747\u6BCF\u79D2\u8BFB\u6570\u636E\u91CF</td><td style="text-align:left;">\u7B2C3\u5217 * 2 / 1024 / nsecs</td><td style="text-align:left;">MB/s</td></tr><tr><td style="text-align:left;">MBw/s</td><td style="text-align:left;">\u5E73\u57471\u79D2\u5185\u5199\u6570\u636E\u91CF</td><td style="text-align:left;">\u7B2C7\u5217* 2 / 1024 / nsecs</td><td style="text-align:left;">MB/s</td></tr><tr><td style="text-align:left;">avio</td><td style="text-align:left;">IO\u64CD\u4F5C\u7684\u5E73\u5747\u64CD\u4F5C\u65F6\u957F</td><td style="text-align:left;">\u7B2C10\u5217 / iotot</td><td style="text-align:left;">ms</td></tr><tr><td style="text-align:left;">avq</td><td style="text-align:left;">\u5E73\u5747\u9635\u5217\u6DF1\u5EA6\uFF0C\u5373\u52A0\u6743\u540E\u7684IO\u64CD\u4F5C\u65F6\u957F</td><td style="text-align:left;">\u7B2C11\u5217/iotot</td><td style="text-align:left;">ms</td></tr><tr><td style="text-align:left;">busy</td><td style="text-align:left;">\u78C1\u76D8\u5229\u7528\u7387</td><td style="text-align:left;">\u7B2C10\u5217 / mstot</td><td style="text-align:left;">\u767E\u5206\u6BD4</td></tr></tbody></table><ul><li>nsecs\uFF1A\u91C7\u6837\u65F6\u95F4\u95F4\u9694</li><li>iotot\uFF1A\u8BFB\u5199\u6B21\u6570\u4E4B\u548C\uFF0C\u5373\u7B2C1\u5217+\u7B2C5\u5217</li><li>mstot\uFF1A\u5229\u7528CPU\u6570\u636E\u8BA1\u7B97\u7684\u5E73\u5747\u95F4\u9694\u65F6\u95F4\uFF0C\u5355\u4F4D\u662F\u6BEB\u79D2\u3002\u516C\u5F0F\u4E3A<code>cputot * 1000 / hertz / nrcpu</code></li><li>cputot\uFF1A\u4E24\u6B21\u91C7\u6837\u70B9\u4E4B\u95F4\u6240\u6709cpu\u7684\u6D88\u8017\u65F6\u95F4\u4E4B\u548C, \u5355\u4F4D\u662F jiffies</li><li>hertz\uFF1A100 \u8868\u793A1\u79D2\u5185\u6709100\u4E2Ajiffies</li><li>nrcpu\uFF1A\u4E3B\u673ACPU\u4E2A\u6570</li></ul><p>\u5982\u679Cavq\u8FDC\u5927\u4E8Eavio,\u5219\u8BF4\u660EIO\u5927\u90E8\u5206\u6D88\u8017\u5728\u7B49\u5F85\u548C\u6392\u961F\u4E2D\uFF0C\u800C\u4E0D\u662F\u6570\u636E\u4F20\u8F93\u672C\u8EAB\u3002</p><h2 id="network" tabindex="-1">Network <a class="header-anchor" href="#network" aria-hidden="true">#</a></h2><p>\u8BFB\u53D6/proc/net/dev\u83B7\u53D6\u6240\u6709\u7F51\u5361\u4FE1\u606F</p><blockquote><p>AAA:~ # cat /proc/net/dev<br> Inter-| Receive | Transmit<br> face |bytes packets errs drop fifo frame compressed multicast|bytes packets errs drop fifo colls carrier compressed<br> lo:5993298914 41500939 0 0 0 0 0 0 5993298914 41500939 0 0 0 0 0 0<br> eth0: 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0<br> eth4:46036327 544231 0 0 0 0 0 1 31411179 41268 0 0 0 0 0 0<br> eth5:48454032 556137 0 0 0 0 0 30920 3808752 7778 0 0 0 0 0 0<br> eth2: 7766519 106577 0 0 0 0 0 3428 531166 7950 0 0 0 0 0 0<br> eth3:50947490 669306 0 0 0 0 0 30980 680 8 0 0 0 0 0 0<br> bond1:94490359 1100368 0 0 0 0 0 30921 35219931 49046 0 0 0 0 0 0<br> AAA:~ #</p></blockquote><ul><li>\u6700\u5DE6\u8FB9\u7684\u8868\u793A\u63A5\u53E3\u7684\u540D\u5B57\uFF0CReceive\u8868\u793A\u6536\u5305\uFF0CTransmit\u8868\u793A\u53D1\u5305\u3002</li><li>bytes\uFF1A\u6536\u53D1\u7684\u5B57\u8282\u6570</li><li>packets\uFF1A\u8868\u793A\u6536\u53D1\u6B63\u786E\u7684\u5305\u91CF</li><li>errs\uFF1A\u8868\u793A\u6536\u53D1\u9519\u8BEF\u7684\u5305\u91CF</li><li>drop\uFF1A\u8868\u793A\u6536\u53D1\u4E22\u5F03\u7684\u5305\u91CF</li><li>\u4E0A\u9762\u56DB\u4E2A\u503C\u662F\u81EA\u7F51\u5361\u542F\u52A8\u4EE5\u6765\u7684\u7D2F\u79EF\u503C, \u6267\u884C<code>ifconfig ethX down;ifconfig ethX up</code>\u4F1A\u6E05\u96F6\u8FD9\u4E9B\u503C</li></ul><p>\u7F51\u5361\u7684\u5E26\u5BBD\u548C\u53CC\u5DE5\u6A21\u5F0F\u5E76\u4E0D\u662F\u4ECE<code>/proc</code>\u8BFB\u53D6\uFF0C\u800C\u662F\u901A\u8FC7\u7C7B\u4F3C\u4E0B\u9762\u7684\u4EE3\u7801\u83B7\u53D6\u3002</p><div class="language-c"><span class="copy"></span><pre><code><span class="line"><span style="color:#89DDFF;font-style:italic;">#include</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&lt;</span><span style="color:#C3E88D;">string.h</span><span style="color:#89DDFF;">&gt;</span></span>
<span class="line"><span style="color:#89DDFF;font-style:italic;">#include</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&lt;</span><span style="color:#C3E88D;">stdio.h</span><span style="color:#89DDFF;">&gt;</span></span>
<span class="line"><span style="color:#89DDFF;font-style:italic;">#include</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&lt;</span><span style="color:#C3E88D;">sys/ioctl.h</span><span style="color:#89DDFF;">&gt;</span></span>
<span class="line"><span style="color:#89DDFF;font-style:italic;">#include</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&lt;</span><span style="color:#C3E88D;">linux/ethtool.h</span><span style="color:#89DDFF;">&gt;</span></span>
<span class="line"><span style="color:#89DDFF;font-style:italic;">#include</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&lt;</span><span style="color:#C3E88D;">sys/types.h</span><span style="color:#89DDFF;">&gt;</span></span>
<span class="line"><span style="color:#89DDFF;font-style:italic;">#include</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&lt;</span><span style="color:#C3E88D;">sys/socket.h</span><span style="color:#89DDFF;">&gt;</span></span>
<span class="line"><span style="color:#89DDFF;font-style:italic;">#include</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&lt;</span><span style="color:#C3E88D;">linux/sockios.h</span><span style="color:#89DDFF;">&gt;</span></span>
<span class="line"><span style="color:#89DDFF;font-style:italic;">#include</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&lt;</span><span style="color:#C3E88D;">linux/if.h</span><span style="color:#89DDFF;">&gt;</span></span>
<span class="line"><span style="color:#C792EA;">int</span><span style="color:#A6ACCD;"> </span><span style="color:#82AAFF;">main</span><span style="color:#89DDFF;">(</span><span style="color:#C792EA;">int</span><span style="color:#A6ACCD;"> argc</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#C792EA;">char</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">**</span><span style="color:#A6ACCD;">argv</span><span style="color:#89DDFF;">)</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#C792EA;">int</span><span style="color:#F07178;"> sockfd</span><span style="color:#89DDFF;">;</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#C792EA;">struct</span><span style="color:#F07178;"> ifreq ifreq</span><span style="color:#89DDFF;">;</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#C792EA;">struct</span><span style="color:#F07178;"> ethtool_cmd 	ethcmd</span><span style="color:#89DDFF;">;</span></span>
<span class="line"><span style="color:#F07178;">    sockfd </span><span style="color:#89DDFF;">=</span><span style="color:#F07178;"> </span><span style="color:#82AAFF;">socket</span><span style="color:#89DDFF;">(</span><span style="color:#F07178;">AF_INET</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> SOCK_DGRAM</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">);</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#82AAFF;">memset</span><span style="color:#89DDFF;">(&amp;</span><span style="color:#F07178;">ifreq</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;">  </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">sizeof</span><span style="color:#F07178;"> ifreq</span><span style="color:#89DDFF;">);</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#82AAFF;">memset</span><span style="color:#89DDFF;">(&amp;</span><span style="color:#F07178;">ethcmd</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">sizeof</span><span style="color:#F07178;"> ethcmd</span><span style="color:#89DDFF;">);</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#82AAFF;">strncpy</span><span style="color:#89DDFF;">((</span><span style="color:#C792EA;">void</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">*)&amp;</span><span style="color:#A6ACCD;">ifreq</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">ifr_ifrn</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">ifrn_name</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">eth4</span><span style="color:#89DDFF;">&quot;</span><span style="color:#89DDFF;">,</span></span>
<span class="line"><span style="color:#F07178;">                    </span><span style="color:#89DDFF;">sizeof</span><span style="color:#F07178;"> </span><span style="color:#A6ACCD;">ifreq</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">ifr_ifrn</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">ifrn_name</span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">);</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#A6ACCD;">ifreq</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">ifr_ifru</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">ifru_data</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">=</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">(</span><span style="color:#C792EA;">void</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">*)&amp;</span><span style="color:#F07178;">ethcmd</span><span style="color:#89DDFF;">;</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#A6ACCD;">ethcmd</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">cmd</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">=</span><span style="color:#F07178;"> ETHTOOL_GSET</span><span style="color:#89DDFF;">;</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#82AAFF;">ioctl</span><span style="color:#89DDFF;">(</span><span style="color:#F07178;">sockfd</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> SIOCETHTOOL</span><span style="color:#89DDFF;">,</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">&amp;</span><span style="color:#F07178;">ifreq</span><span style="color:#89DDFF;">);</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#82AAFF;">printf</span><span style="color:#89DDFF;">(</span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">speed is %d Mb, mode is %s duplex</span><span style="color:#A6ACCD;">\\n</span><span style="color:#89DDFF;">&quot;</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;">ethcmd</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">speed</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;">ethcmd</span><span style="color:#89DDFF;">.</span><span style="color:#A6ACCD;">duplex</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">?</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">Full</span><span style="color:#89DDFF;">&quot;</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">:</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">Half</span><span style="color:#89DDFF;">&quot;</span><span style="color:#89DDFF;">);</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#89DDFF;font-style:italic;">return</span><span style="color:#F07178;"> </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">;</span></span>
<span class="line"><span style="color:#89DDFF;">}</span></span>
<span class="line"></span></code></pre></div><p><a href="http://www.linuxjournal.com/node/6908/" target="_blank" rel="noopener noreferrer">\u8FD9\u7BC7\u6587\u7AE0</a>\u8BE6\u7EC6\u5730\u4ECB\u7ECD\u4E86ETHTOOL \u8FD9\u4E2A\u64CD\u4F5C\uFF0C\u53EA\u9700\u8981\u914D\u5408ioctl\u5C31\u53EF\u4EE5\u83B7\u5F97\u7F51\u5361\u7684\u5168\u90E8\u4FE1\u606F\u3002Linux\u4E0B\u7684ethtool\u5DE5\u5177\u4E5F\u662F\u901A\u8FC7\u8FD9\u79CD\u65B9\u5F0F\u67E5\u8BE2\u7F51\u5361\u9A71\u52A8\u548C\u914D\u7F6E\u4FE1\u606F\u3002</p><blockquote><p>AAA:~ # strace -ftT -e trace=ioctl ethtool eth4 &gt;/dev/null<br> 11:31:48 ioctl(1, SNDCTL_TMR_TIMEBASE or TCGETS, 0x7fffca09bb30) = -1 ENOTTY (Inappropriate ioctl for device) &lt;0.000012&gt;<br> 11:31:48 ioctl(3, SIOCETHTOOL, 0x7fffca09cb10) = 0 &lt;0.000017&gt;<br> 11:31:48 ioctl(3, SIOCETHTOOL, 0x7fffca09cb10) = 0 &lt;0.000012&gt;<br> 11:31:48 ioctl(3, SIOCETHTOOL, 0x7fffca09cb10) = 0 &lt;0.000025&gt;<br> 11:31:48 ioctl(3, SIOCETHTOOL, 0x7fffca09cb10) = 0 &lt;0.000027&gt;<br> AAA:~ #</p></blockquote><p>\u7F51\u5361\u5229\u7528\u7387\u7684\u8BA1\u7B97\u65B9\u6CD5\u5982\u4E0B\uFF1A \u5168\u53CC\u5DE5\uFF1A \u83B7\u53D6rbytes\u4E0Ewbytes\u4E2D\u7684\u6700\u5927\u503CA, curspeed = A * 8 / 1000 \u5355\u53CC\u5DE5\uFF1A curspeed = (rbytes + wbytes) * 8 / 1000 \u6700\u7EC8\u5229\u7528\u7387\u7684\u516C\u5F0F\uFF1A curspeed / \uFF08\u7F51\u5361\u5E26\u5BBD * 1000\uFF09</p><blockquote><p>rbytes\u548Cwbytes\u662F\u4ECE/proc/net/dev\u8BFB\u53D6 <code>* 8</code> \u662F\u628A bytes \u8F6C\u5316\u4E3A bit, <code>/ 1000</code> \u5355\u4F4D\u53D8\u4E3A Kb, \u901A\u8FC7SIOCETHTOOL\u83B7\u5F97\u7684\u5E26\u5BBD\u662FMb, \u6240\u4EE5 <code>* 1000</code> \u8F6C\u6362\u4E3AKb</p></blockquote><h1 id="\u8FC7\u8F7D\u8D44\u6E90\u9AD8\u4EAE" tabindex="-1">\u8FC7\u8F7D\u8D44\u6E90\u9AD8\u4EAE <a class="header-anchor" href="#\u8FC7\u8F7D\u8D44\u6E90\u9AD8\u4EAE" aria-hidden="true">#</a></h1><p>atop\u9884\u8BBE\u4E86\u9488\u5BF9\u6BCF\u4E2A\u8D44\u6E90\uFF08\u5982CPU\uFF0CMemory)\u7684\u9608\u503C\uFF0C \u5982\u679C\u5F53\u524D\u5229\u7528\u7387\u8D85\u8FC7\u4E86\u9608\u503C\uFF0C\u5219\u4F1A\u5C06\u8BE5\u8D44\u6E90\u7EA2\u8272\u9AD8\u4EAE\u663E\u793A\u3002 \u5F53\u8FBE\u5230\u9608\u503C\u768480%\u65F6\uFF0C\u4F7F\u7528\u9752\u7070\u8272\u9AD8\u4EAE\u663E\u793A\u3002\u8FD9\u4E9B\u503C\u53EF\u4EE5\u7528\u6237\u81EA\u5B9A\u4E49\u3002\u5982\u4E0B\u662F\u8D44\u6E90\u53CA\u5BF9\u5E94\u7684\u9ED8\u8BA4\u9608\u503C\uFF1A</p><table><thead><tr><th style="text-align:left;">\u8D44\u6E90</th><th style="text-align:left;">\u9608\u503C</th></tr></thead><tbody><tr><td style="text-align:left;">CPU</td><td style="text-align:left;">90%</td></tr><tr><td style="text-align:left;">\u5185\u5B58</td><td style="text-align:left;">90%</td></tr><tr><td style="text-align:left;">Swap</td><td style="text-align:left;">80%</td></tr><tr><td style="text-align:left;">\u78C1\u76D8</td><td style="text-align:left;">70%</td></tr><tr><td style="text-align:left;">\u7F51\u5361</td><td style="text-align:left;">90%</td></tr></tbody></table><p>\u9ED8\u8BA4\u8FDB\u7A0B\u5217\u8868\u662F\u6309CPU\u6392\u5E8F\u7684\u3002\u6309<code>A</code>\u4F1A\u81EA\u52A8\u4F9D\u7167\u5F53\u524D\u8FC7\u8F7D\u6700\u4E25\u91CD\u7684\u8D44\u6E90\u6392\u5E8F\u5F53\u524D\u8FDB\u7A0B\u5217\u8868\u3002\u5982\u4F55\u68C0\u6D4B\u8C01\u662F\u6700\u4E25\u91CD\u8FC7\u8F7D\u7684\u8D44\u6E90\u3002\u505A\u6CD5\u662F\u5C06\u6BCF\u4E2A\u8D44\u6E90\u81EA\u8EAB\u7684\u5229\u7528\u7387\u8FDB\u884C\u52A0\u6743\u5904\u7406(\u5373\u9664\u4EE5\u81EA\u8EAB\u7684\u8FC7\u8F7D\u9608\u503C\uFF09\uFF0C\u7136\u540E\u9009\u62E9\u6700\u5927\u7684\u90A3\u4E2A\u3002\u4E3E\u4F8B\u5982\u4E0B\uFF1A</p><table><thead><tr><th>\u8D44\u6E90</th><th style="text-align:center;">\u5F53\u524D\u5229\u7528\u7387</th><th style="text-align:center;">\u52A0\u6743\u516C\u5F0F</th><th style="text-align:right;">\u52A0\u6743\u7ED3\u679C</th></tr></thead><tbody><tr><td>CPU</td><td style="text-align:center;">70%</td><td style="text-align:center;">70% / 90%</td><td style="text-align:right;">77%</td></tr><tr><td>\u5185\u5B58</td><td style="text-align:center;">90%</td><td style="text-align:center;">90% / 90%</td><td style="text-align:right;">100%</td></tr><tr><td>Swap</td><td style="text-align:center;">0%</td><td style="text-align:center;">70% / 80%</td><td style="text-align:right;">0%</td></tr><tr><td>\u78C1\u76D8</td><td style="text-align:center;">80%</td><td style="text-align:center;">80% / 70%</td><td style="text-align:right;">114%</td></tr><tr><td>\u7F51\u5361</td><td style="text-align:center;">20%</td><td style="text-align:center;">20% / 90%</td><td style="text-align:right;">22%</td></tr></tbody></table><p>\u8FD9\u6837ATOP\u5224\u65AD\u5F53\u524D\u6700\u4E25\u91CD\u8FC7\u8F7D\u7684\u8D44\u6E90\u662F\u78C1\u76D8\uFF0C\u5219\u8FDB\u7A0B\u6309\u78C1\u76D8\u5229\u7528\u7387\u964D\u5E8F\u6392\u5217\u3002\u6211\u4EEC\u7ECF\u5E38\u9047\u5230\u7684\u90FD\u662F\u9AD8\u8D1F\u8F7D\u670D\u52A1\u5668\uFF0C\u4F7F\u7528<code>A</code>\u80FD\u81EA\u52A8\u5224\u65AD\u5F53\u524D\u8D44\u6E90\u74F6\u9888\u5728\u54EA\u5757\uFF0C\u5E76\u663E\u793A\u5BFC\u81F4\u76F8\u5173\u8D44\u6E90\u6781\u5EA6\u7D27\u5F20\u7684TOP\u8FDB\u7A0B\u3002\u5BF9\u6392\u67E5\u95EE\u9898\u5F88\u6709\u5E2E\u52A9\u3002\u8FD9\u91CC\u6709\u4E00\u79CD\u7279\u6B8A\u60C5\u51B5\uFF0C\u5F53\u6700\u4E25\u91CD\u8FC7\u8F7D\u8D44\u6E90\u662F\u5185\u5B58\u4E14\u52A0\u6743\u540E\u4F4E\u4E8E70%\uFF0C \u5219\u4ECD\u6309CPU\u6392\u5E8F\u3002</p><div class="language-c"><span class="copy"></span><pre><code><span class="line"><span style="color:#676E95;font-style:italic;">/*</span></span>
<span class="line"><span style="color:#676E95;font-style:italic;">** if the system is hardly loaded, still CPU-ordering of</span></span>
<span class="line"><span style="color:#676E95;font-style:italic;">** processes is most interesting (instead of memory)</span></span>
<span class="line"><span style="color:#676E95;font-style:italic;">*/</span></span>
<span class="line"><span style="color:#89DDFF;font-style:italic;">if</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">highbadness </span><span style="color:#89DDFF;">&lt;</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">70</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&amp;&amp;</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">*</span><span style="color:#A6ACCD;">highorderp </span><span style="color:#89DDFF;">==</span><span style="color:#A6ACCD;"> MSORTMEM</span><span style="color:#89DDFF;">)</span></span>
<span class="line"><span style="color:#A6ACCD;">        </span><span style="color:#89DDFF;">*</span><span style="color:#A6ACCD;">highorderp </span><span style="color:#89DDFF;">=</span><span style="color:#A6ACCD;"> MSORTCPU</span><span style="color:#89DDFF;">;</span></span>
<span class="line"></span></code></pre></div>`,55),p=[n];function c(r,i,d,y,D,F){return l(),t("div",null,p)}var f=s(o,[["render",c]]);export{C as __pageData,f as default};
