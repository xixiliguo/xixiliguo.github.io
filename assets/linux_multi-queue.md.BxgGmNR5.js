import{_ as s,c as a,o as n,a2 as i}from"./chunks/framework.YBtj1D-X.js";const g=JSON.parse('{"title":"Linux 网卡多队列介绍","description":"","frontmatter":{"title":"Linux 网卡多队列介绍","author":"Peter Wang","tags":["RSS","多网卡队列"],"date":"2019-04-07T02:05:29.000Z","draft":false},"headers":[],"relativePath":"linux/multi-queue.md","filePath":"linux/multi-queue.md","lastUpdated":1722675993000}'),e={name:"linux/multi-queue.md"},p=i(`<p>单CPU处理网络IO存在瓶颈, 目前经常使用网卡多队列提高性能.</p><p>通常情况下, 每张网卡有一个队列(queue), 所有收到的包从这个队列入, 内核从这个队列里取数据处理. 该队列其实是ring buffer(环形队列), 内核如果取数据不及时, 则会存在丢包的情况.<br> 一个CPU处理一个队列的数据, 这个叫中断. 默认是cpu0(第一个CPU)处理. 一旦流量特别大, 这个CPU负载很高, 性能存在瓶颈. 所以网卡开发了多队列功能, 即一个网卡有多个队列, 收到的包根据TCP四元组信息hash后放入其中一个队列, 后面该链接的所有包都放入该队列. 每个队列对应不同的中断, 使用irqbalance将不同的中断绑定到不同的核. 充分利用了多核并行处理特性. 提高了效率.</p><h3 id="多网卡队列实现图例" tabindex="-1">多网卡队列实现图例 <a class="header-anchor" href="#多网卡队列实现图例" aria-label="Permalink to &quot;多网卡队列实现图例&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>             普通单队列                                   </span></span>
<span class="line"><span>   +-----------------------------+                        </span></span>
<span class="line"><span>   | queue                       |                        </span></span>
<span class="line"><span>   |                             |                        </span></span>
<span class="line"><span>   |   +----------+  +----------+|           +---------+  </span></span>
<span class="line"><span>   |   |  packet  |  |  packet  ||----------&gt;|  CPU 0  |  </span></span>
<span class="line"><span>   |   +----------+  +----------+|           +---------+  </span></span>
<span class="line"><span>   +-----------------------------+                        </span></span>
<span class="line"><span>                                                    </span></span>
<span class="line"><span>                             开启多网卡队列               </span></span>
<span class="line"><span>                                                        </span></span>
<span class="line"><span>    +----------------------------+                       </span></span>
<span class="line"><span>    | queue                      |                       </span></span>
<span class="line"><span>    |                            |                       </span></span>
<span class="line"><span>    |  +----------+ +----------+ |           +---------+ </span></span>
<span class="line"><span>    |  |  packet  | |  packet  | |---------&gt; |  CPU 0  | </span></span>
<span class="line"><span>    |  +----------+ +----------+ |           +---------+ </span></span>
<span class="line"><span>    +----------------------------+           +---------+ </span></span>
<span class="line"><span>                                             |  CPU 1  |  </span></span>
<span class="line"><span>                                             +---------+  </span></span>
<span class="line"><span>                                             +---------+  </span></span>
<span class="line"><span>    +----------------------------+           |  CPU 2  |  </span></span>
<span class="line"><span>    | queue                      |           +---------+  </span></span>
<span class="line"><span>    |                            |                        </span></span>
<span class="line"><span>    |  +----------+ +----------+ |           +---------+  </span></span>
<span class="line"><span>    |  |  packet  | |  packet  | |---------&gt; |  CPU 3  |  </span></span>
<span class="line"><span>    |  +----------+ +----------+ |           +---------+  </span></span>
<span class="line"><span>    +----------------------------+</span></span></code></pre></div><h3 id="检查中断与对应的cpu关系" tabindex="-1">检查中断与对应的CPU关系 <a class="header-anchor" href="#检查中断与对应的cpu关系" aria-label="Permalink to &quot;检查中断与对应的CPU关系&quot;">​</a></h3><p>如下显示, 第一列是中断号, 后面两列是对应CPU处理该中断的次数, virtio-input和 virtio-output为网卡队列的中断 可见大部分包被CPU1处理</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># cat /proc/interrupts | egrep &#39;CPU|virtio.*(input|output)&#39;</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">           CPU0</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">       CPU1</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> 27:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">          7</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">      89632</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   PCI-MSI-edge</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">      virtio3-input.0</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> 30:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">          2</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">          0</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   PCI-MSI-edge</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">      virtio3-output.0</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> 31:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">          7</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">      23319</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   PCI-MSI-edge</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">      virtio3-input.1</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> 32:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">          2</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">          0</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   PCI-MSI-edge</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">      virtio3-output.1</span></span></code></pre></div><p>查询具体中断所绑定的CPU信息<br> smp_affinity_list显示CPU序号. 比如 0 代表 CPU0, 2代表 CPU2 smp_affinity 是十六进制显示. 比如 2 为10, 代表 CPU1 (第二个CPU)</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># for i in {30..32}; do echo -n &quot;Interrupt $i is allowed on CPUs &quot;; cat /proc/irq/$i/smp_affinity_list; done</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Interrupt</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 30</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> is</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> allowed</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> on</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> CPUs</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Interrupt</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 31</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> is</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> allowed</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> on</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> CPUs</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Interrupt</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 32</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> is</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> allowed</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> on</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> CPUs</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0</span></span></code></pre></div><h3 id="rps-xps-rfs" tabindex="-1">RPS, XPS, RFS <a class="header-anchor" href="#rps-xps-rfs" aria-label="Permalink to &quot;RPS, XPS, RFS&quot;">​</a></h3><p>之前谈的多网卡队列需要硬件实现, RPS则是软件实现,将包让指定的CPU去处理中断.<br> 配置文件为<code>/sys/class/net/eth*/queues/rx*/rps_cpus</code>. 默认为0, 表示不启动RPS 如果要让该队列被CPU0,1处理, 则设置 echo &quot;3&quot; &gt; /sys/class/net/eth*/queues/rx*/rps_cpus, 3代表十六进制表示11, 即指CPU0和CPU1<br> 在开启多网卡队列RSS时, 已经起到了均衡的作用. RPS则可以在队列数小于CPU数时, 进一步提升性能. 因为进一步利用所有CPU. RFS则进一步扩展RPS的能力, 它会分析并将包发往最合适的CPU(程序运行所在的CPU). 检查当前RPS, RFS开启情况:</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># for i in $(ls -1 /sys/class/net/eth*/queues/rx*/rps_*); do echo -n &quot;\${i}:  &quot;  ; cat \${i}; done</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/sys/class/net/eth0/queues/rx-0/rps_cpus:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  3</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/sys/class/net/eth0/queues/rx-0/rps_flow_cnt:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  4096</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/sys/class/net/eth0/queues/rx-1/rps_cpus:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  3</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/sys/class/net/eth0/queues/rx-1/rps_flow_cnt:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  4096</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># cat /proc/sys/net/core/rps_sock_flow_entries</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">8192</span></span></code></pre></div><p>XPS是将发送包指定到CPU, 通常和同一队列的rps和xps配置一致.</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># for i in $(ls -1 /sys/class/net/eth*/queues/tx*/xps_cpus); do echo -n &quot;\${i}:  &quot;  ; cat \${i}; done</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/sys/class/net/eth0/queues/tx-0/xps_cpus:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  3</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">/sys/class/net/eth0/queues/tx-1/xps_cpus:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  3</span></span></code></pre></div><h3 id="根据top输出查看软中断负载" tabindex="-1">根据top输出查看软中断负载 <a class="header-anchor" href="#根据top输出查看软中断负载" aria-label="Permalink to &quot;根据top输出查看软中断负载&quot;">​</a></h3><p>top进入交互式界面后, 按1 显示所有cpu的负载. si 是软中断的CPU使用率. 如果高比如50%, 说明该CPU忙于处理中断, 通常就是收发网络IO</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>top - 18:58:33 up 16 days, 19:58,  2 users,  load average: 0.00, 0.01, 0.05</span></span>
<span class="line"><span>Tasks:  89 total,   2 running,  87 sleeping,   0 stopped,   0 zombie</span></span>
<span class="line"><span>%Cpu0  :  1.3 us,  0.0 sy,  0.0 ni, 98.7 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st</span></span>
<span class="line"><span>%Cpu1  :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st</span></span>
<span class="line"><span>KiB Mem :  3880032 total,  2911912 free,   199600 used,   768520 buff/cache</span></span>
<span class="line"><span>KiB Swap:        0 total,        0 free,        0 used.  3411892 avail Mem</span></span></code></pre></div><h3 id="参考" tabindex="-1">参考 <a class="header-anchor" href="#参考" aria-label="Permalink to &quot;参考&quot;">​</a></h3><p><a href="https://www.kernel.org/doc/Documentation/IRQ-affinity.txt" target="_blank" rel="noreferrer">https://www.kernel.org/doc/Documentation/IRQ-affinity.txt</a><br><a href="https://www.kernel.org/doc/Documentation/networking/scaling.txt" target="_blank" rel="noreferrer">https://www.kernel.org/doc/Documentation/networking/scaling.txt</a><br><a href="https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-networking-configuration_tools#sect-Red_Hat_Enterprise_Linux-Performance_Tuning_Guide-Configuration_tools-Configuring_Receive_Packet_Steering_RPS" target="_blank" rel="noreferrer">https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-networking-configuration_tools#sect-Red_Hat_Enterprise_Linux-Performance_Tuning_Guide-Configuration_tools-Configuring_Receive_Packet_Steering_RPS</a><br><a href="https://lwn.net/Articles/370153/" target="_blank" rel="noreferrer">https://lwn.net/Articles/370153/</a><br><a href="https://lwn.net/Articles/412062/" target="_blank" rel="noreferrer">https://lwn.net/Articles/412062/</a></p>`,19),t=[p];function l(h,r,k,c,o,d){return n(),a("div",null,t)}const C=s(e,[["render",l]]);export{g as __pageData,C as default};