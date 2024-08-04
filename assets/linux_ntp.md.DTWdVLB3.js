import{_ as s,c as a,o as i,a2 as n,ad as p}from"./chunks/framework.YBtj1D-X.js";const y=JSON.parse('{"title":"理解NTP协议","description":"","frontmatter":{"title":"理解NTP协议","author":"Peter Wang","tags":["NTP","协议"],"date":"2018-01-28T07:02:50.000Z","draft":false},"headers":[],"relativePath":"linux/ntp.md","filePath":"linux/ntp.md","lastUpdated":1722757971000}'),l={name:"linux/ntp.md"},t=n(`<p>NTP协议用来校准服务器的时间. 本文详细介绍原理和协议格式</p><h2 id="时钟同步的过程" tabindex="-1">时钟同步的过程 <a class="header-anchor" href="#时钟同步的过程" aria-label="Permalink to &quot;时钟同步的过程&quot;">​</a></h2><ol><li>A发送ntp消息到B, 消息里含发送时间戳 T1.</li><li>B收到ntp消息后, 将接受时间T2写入该消息体.</li><li>当B发送ntp响应消息给A时, 将发送时间T3也写入该消息体</li><li>A收到响应ntp消息的时间为T4</li></ol><p>那么<br> round-trip 为: (T4 - T1) - (T3 - T2)<br> 时间偏移为: ((T2 - T1) + (T3 - T4)) / 2</p><p>ntp请求消息和响应消息格式完全一样, 使用udp协议. 默认的ntp服务器监听端口是123<br> 如下chronyd(centos下默认的ntp软件)正在监听123端口</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">$</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> lsof</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> -i:123</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">COMMAND</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">  PID</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   USER</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   FD</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   TYPE</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> DEVICE</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> SIZE/OFF</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> NODE</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> NAME</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">chronyd</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 2439</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> chrony</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">    3u</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">  IPv4</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  23270</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">      0t0</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">  UDP</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> *</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">:ntp</span></span></code></pre></div><h2 id="ntp消息格式" tabindex="-1">ntp消息格式 <a class="header-anchor" href="#ntp消息格式" aria-label="Permalink to &quot;ntp消息格式&quot;">​</a></h2><p>ntp消息由消息头,扩展字段,可选的鉴权码组成. 在实际使用中, 一般只携带消息头. 如下是消息头的具体格式</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>     0                   1                   2                   3</span></span>
<span class="line"><span>     0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span>
<span class="line"><span>    |LI | VN  |Mode |    Stratum     |     Poll      |  Precision   |</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span>
<span class="line"><span>    |                         Root Delay                            |</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span>
<span class="line"><span>    |                         Root Dispersion                       |</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span>
<span class="line"><span>    |                          Reference ID                         |</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span>
<span class="line"><span>    |                                                               |</span></span>
<span class="line"><span>    +                     Reference Timestamp (64)                  +</span></span>
<span class="line"><span>    |                                                               |</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span>
<span class="line"><span>    |                                                               |</span></span>
<span class="line"><span>    +                      Origin Timestamp (64)                    +</span></span>
<span class="line"><span>    |                                                               |</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span>
<span class="line"><span>    |                                                               |</span></span>
<span class="line"><span>    +                      Receive Timestamp (64)                   +</span></span>
<span class="line"><span>    |                                                               |</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span>
<span class="line"><span>    |                                                               |</span></span>
<span class="line"><span>    +                      Transmit Timestamp (64)                  |</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span></code></pre></div><p>时间格式有两种, 它们代表从1900年1月1号 0时 UTC时间至今的秒数</p><ul><li>NTP Timestamp Format<br> 8个字节, 前32位表示秒数, 后32位表示 <code>1/2的32次方</code> 秒</li></ul><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>     0                   1                   2                   3</span></span>
<span class="line"><span>     0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span>
<span class="line"><span>    |                            Seconds                            |</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span>
<span class="line"><span>    |                            Fraction                           |</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span></code></pre></div><ul><li>NTP Short Format<br> 4个字节, 前16位表示秒数, 后16位表示 <code>1/2的16次方</code> 秒</li></ul><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>     0                   1                   2                   3</span></span>
<span class="line"><span>     0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span>
<span class="line"><span>    |          Seconds              |           Fraction            |</span></span>
<span class="line"><span>    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+</span></span></code></pre></div><ul><li>消息头各字段解释:</li></ul><p>LI Leap Indicator (leap): 2比特, 用来警告是否有闰秒或者未和上级同步. 具体取值和含义如下:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>    +-------+----------------------------------------+</span></span>
<span class="line"><span>    | Value | Meaning                                |</span></span>
<span class="line"><span>    +-------+----------------------------------------+</span></span>
<span class="line"><span>    | 0     | no warning                             |</span></span>
<span class="line"><span>    | 1     | last minute of the day has 61 seconds  |</span></span>
<span class="line"><span>    | 2     | last minute of the day has 59 seconds  |</span></span>
<span class="line"><span>    | 3     | unknown (clock unsynchronized)         |</span></span>
<span class="line"><span>    +-------+----------------------------------------+</span></span></code></pre></div><p>VN Version Number: 3比特,指定ntp版本 Mode (mode): 3比特, 指定工作模式, 通常我们使用3,4 代表客户端-服务端模式</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>    +-------+--------------------------+</span></span>
<span class="line"><span>    | Value | Meaning                  |</span></span>
<span class="line"><span>    +-------+--------------------------+</span></span>
<span class="line"><span>    | 0     | reserved                 |</span></span>
<span class="line"><span>    | 1     | symmetric active         |</span></span>
<span class="line"><span>    | 2     | symmetric passive        |</span></span>
<span class="line"><span>    | 3     | client                   |</span></span>
<span class="line"><span>    | 4     | server                   |</span></span>
<span class="line"><span>    | 5     | broadcast                |</span></span>
<span class="line"><span>    | 6     | NTP control message      |</span></span>
<span class="line"><span>    | 7     | reserved for private use |</span></span>
<span class="line"><span>    +-------+--------------------------+</span></span></code></pre></div><p>Stratum (stratum): 8比特指定阶层. 通常Server更新该字段.<br> 顶层分配为数字0。一个通过阶层n同步的服务器将运行在阶层n + 1。 阶层为0的是高精度计时设备，例如原子钟（如铯、铷）、GPS时钟或其他无线电时钟。它们生成非常精确的脉冲秒信号，触发所连接计算机上的中断和时间戳。阶层0设备也称为参考（基准）时钟. 阶层1服务器连接阶层0的设备, 它们也被称为主要（primary）时间服务器。 <img src="`+p+`" alt="ntp阶层图"> 更具体的取值含义如下:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>    +--------+-----------------------------------------------------+</span></span>
<span class="line"><span>    | Value  | Meaning                                             |</span></span>
<span class="line"><span>    +--------+-----------------------------------------------------+</span></span>
<span class="line"><span>    | 0      | unspecified or invalid                              |</span></span>
<span class="line"><span>    | 1      | primary server (e.g., equipped with a GPS receiver) |</span></span>
<span class="line"><span>    | 2-15   | secondary server (via NTP)                          |</span></span>
<span class="line"><span>    | 16     | unsynchronized                                      |</span></span>
<span class="line"><span>    | 17-255 | reserved                                            |</span></span>
<span class="line"><span>    +--------+-----------------------------------------------------+</span></span></code></pre></div><p>Poll: 8比特符号整数, 指示与下一次ntp同步的最短时间间隔. 值为4, 则表示16(2的4次方)秒<br> Precision: 8比特符号整数, 指示时间精度. log2 秒. -18 为微妙<br> Root Delay: 总的 round-trip delay到 Primary server. 单位是 NTP Short Format<br> Root Dispersion: 单位是 NTP Short Format<br> Reference ID: 32比特指示服务端的参考时钟(即上层服务器信息). 即上层时钟源 . 当阶层为1时, 那么上层是原子钟等设备. 没IP, 所以使用ascii 字符 从阶层2开始, 表示IP地址.<br> Reference Timestamp: 指示服务端自身系统时间最后一次被设置的时间戳.通常每Poll一次更新一下<br> Origin Timestamp: 客户端发起时间<br> Receive Timestamp: 服务端接受时间<br> Transmit Timestamp: 服务端发送时间</p><h2 id="抓包实例" tabindex="-1">抓包实例 <a class="header-anchor" href="#抓包实例" aria-label="Permalink to &quot;抓包实例&quot;">​</a></h2><p><code>tcpdump -i eth0 port 123 -nnv</code> 抓取ntp的详细报文, 样例如下:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>17:19:18.566860 IP (tos 0x0, ttl 45, id 33978, offset 0, flags [none], proto UDP (17), length 76)</span></span>
<span class="line"><span>    1.80.235.52.31681 &gt; 192.168.1.247.123: NTPv4, length 48</span></span>
<span class="line"><span>	Client, Leap indicator: clock unsynchronized (192), Stratum 0 (unspecified), poll 3 (8s), precision -6</span></span>
<span class="line"><span>	Root Delay: 1.000000, Root dispersion: 1.000000, Reference-ID: (unspec)</span></span>
<span class="line"><span>	  Reference Timestamp:  0.000000000</span></span>
<span class="line"><span>	  Originator Timestamp: 0.000000000</span></span>
<span class="line"><span>	  Receive Timestamp:    0.000000000</span></span>
<span class="line"><span>	  Transmit Timestamp:   3726119958.485983999 (2018/01/28 17:19:18)</span></span>
<span class="line"><span>	    Originator - Receive Timestamp:  0.000000000</span></span>
<span class="line"><span>	    Originator - Transmit Timestamp: 3726119958.485983999 (2018/01/28 17:19:18)</span></span>
<span class="line"><span>17:19:18.566899 IP (tos 0x0, ttl 64, id 38707, offset 0, flags [DF], proto UDP (17), length 76)</span></span>
<span class="line"><span>    192.168.1.247.123 &gt; 1.80.235.52.31681: NTPv4, length 48</span></span>
<span class="line"><span>	Server, Leap indicator:  (0), Stratum 3 (secondary reference), poll 3 (8s), precision -24</span></span>
<span class="line"><span>	Root Delay: 0.005340, Root dispersion: 0.002105, Reference-ID: 182.92.12.11</span></span>
<span class="line"><span>	  Reference Timestamp:  3726119511.971055101 (2018/01/28 17:11:51)</span></span>
<span class="line"><span>	  Originator Timestamp: 3726119958.485983999 (2018/01/28 17:19:18)</span></span>
<span class="line"><span>	  Receive Timestamp:    3726119958.566745462 (2018/01/28 17:19:18)</span></span>
<span class="line"><span>	  Transmit Timestamp:   3726119958.566777029 (2018/01/28 17:19:18)</span></span>
<span class="line"><span>	    Originator - Receive Timestamp:  +0.080761462</span></span>
<span class="line"><span>	    Originator - Transmit Timestamp: +0.080793029</span></span></code></pre></div><h2 id="相关软件使用" tabindex="-1">相关软件使用 <a class="header-anchor" href="#相关软件使用" aria-label="Permalink to &quot;相关软件使用&quot;">​</a></h2><p>chronyd是centos7引入的新的ntp软件, 代替老的ntpd<br> 如下命令检测当前与上层ntp的同步状态</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">$</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> chronyc</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> sources</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> -v</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">210</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> Number</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> of</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> sources</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 2</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  .--</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> Source</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> mode</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">  &#39;^&#39;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> server,</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &#39;=&#39;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> peer,</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &#39;#&#39;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> local</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> clock.</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> /</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> .-</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> Source</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> state</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &#39;*&#39;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> current</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> synced,</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &#39;+&#39;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> combined</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ,</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &#39;-&#39;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> not</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> combined,</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">|</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> /</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   &#39;?&#39;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> unreachable,</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &#39;x&#39;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> time</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> may</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> be</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> in</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> error,</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &#39;~&#39;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> time</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> too</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> variable.</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">||</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">                                                 .-</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> xxxx</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [ </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">yyyy</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ]</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> +/-</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> zzzz</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">||</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">      Reachability</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> register</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (octal) -.           </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">|</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  xxxx</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> adjusted</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> offset,</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">||</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">      Log2(Polling</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> interval</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) --.      </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">|</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">          |</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  yyyy</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> measured</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> offset,</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">||</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">                                \\</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">     |</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">          |</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  zzzz</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> estimated</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> error.</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">||</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">                                 |</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    |</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">           \\</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">MS</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> Name/IP</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> address</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">         Stratum</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> Poll</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> Reach</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> LastRx</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> Last</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> sample</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">===============================================================================</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">^*</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> time5.aliyun.com</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">              2</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  10</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">   377</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">   733</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   +165us[</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> +206us]</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> +/-</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 5534us</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">^-</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 120.25.115.19</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">                 2</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  10</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">   377</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">   633</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  -1155us[-1155us]</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> +/-</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   65ms</span></span></code></pre></div><p>使用ntpd软件包时检查ntp状态<br> when指多少秒后再一次同步<br> poll指下一次同步的时间间隔 单位:秒<br> reach 与上层服务器已成功连接的次数<br> delay 指RRT 单位: 毫秒<br> offset 指时间偏移值 单位: 毫秒</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">ntpq</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> -p</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">     remote</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">           refid</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">      st</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> t</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> when</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> poll</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> reach</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   delay</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">   offset</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">  jitter</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">==============================================================================</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">+time5.aliyun.co</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 10.137.38.86</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">     2</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> u</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">   11</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">   64</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">    1</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">   25.353</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  -113.04</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  65.276</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">203.107.6.88    10.137.55.181    2 u    9   64    1   45.441  -148.44  89.070</span></span></code></pre></div><p><code>ntpdate -q XX.XX.XX.XX</code> 查询与上层ntp服务器的时间偏移量. 不会更新. <code>-d</code> 打开Debug模式</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">$</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ntpdate</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> -q</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ntp3.aliyun.com</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">server</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 203.107.6.88,</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> stratum</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 2,</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> offset</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 0.797972,</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> delay</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.06859</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">11</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> Feb</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 23:02:36</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ntpdate[21763]:</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> step</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> time</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> server</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 203.107.6.88</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> offset</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.797972</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> sec</span></span></code></pre></div><p>ntp配置最佳实践:<br> 假设ntp服务器为 ntp1.aliyun.com, 配置如下:</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 上层服务器配置</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">server</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ntp1.aliyun.com</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> iburst</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">restrict</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ntp1.aliyun.com</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> nomodify</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> notrap</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> nopeer</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> noquery</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># default 指所有IP, 首先默认显示连接无法执行任何操作</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">restrict</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> default</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> kod</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> nomodify</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> notrap</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> nopeer</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> noquery</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 针对ipv6的配置</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">restrict</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> -6</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> default</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> kod</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> nomodify</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> notrap</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> nopeer</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> noquery</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 配置内网IP可查询不可修改时间</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">restrict</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> xx.xx.xx.xx</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> mask</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> xx.xx.xx.xx</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">  nomodify</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> notrap</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> nopeer</span></span></code></pre></div><p><code>man ntp_acc</code> 查看 restrict 各参数含义<br><code>man ntp_clock</code> 查看 server 各参数含义</p><h2 id="参考" tabindex="-1">参考 <a class="header-anchor" href="#参考" aria-label="Permalink to &quot;参考&quot;">​</a></h2><ul><li>NTP4 RFC: <a href="https://tools.ietf.org/html/rfc5905" target="_blank" rel="noreferrer">https://tools.ietf.org/html/rfc5905</a></li><li>NTP Best Practice: <a href="https://tools.ietf.org/id/draft-reilly-ntp-bcp-01.html" target="_blank" rel="noreferrer">https://tools.ietf.org/id/draft-reilly-ntp-bcp-01.html</a></li></ul>`,37),e=[t];function h(k,F,r,d,c,g){return i(),a("div",null,e)}const C=s(l,[["render",h]]);export{y as __pageData,C as default};