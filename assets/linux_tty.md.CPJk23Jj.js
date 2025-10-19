import{_ as s,c as a,o as n,a2 as p}from"./chunks/framework.KQnwS2KS.js";const u=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"linux/tty.md","filePath":"linux/tty.md","lastUpdated":1760890322000}'),e={name:"linux/tty.md"},t=p(`<h2 id="tty相关知识" tabindex="-1">tty相关知识 <a class="header-anchor" href="#tty相关知识" aria-label="Permalink to &quot;tty相关知识&quot;">​</a></h2><p><code>agetty</code>监控<code>/dev/tty1</code>, 当输入字符+换行符后通过<code>execve</code>启动login进程，然后加载配置和pam动态库， 输入密码鉴权成功后，fork bash进程接管/dev/tty1, 后续所有tty输入输出都会和bash进程交互。通过 <code>strace -ftT -o abc.txt -p [agetty pid]</code>能观察到所有细节。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># systemctl status getty@tty1.service</span></span>
<span class="line"><span>● getty@tty1.service - Getty on tty1</span></span>
<span class="line"><span>     Loaded: loaded (/usr/lib/systemd/system/getty@.service; enabled; preset: enabled)</span></span>
<span class="line"><span>     Active: active (running) since Sun 2025-07-06 19:13:43 CST; 34s ago</span></span>
<span class="line"><span>       Docs: man:agetty(8)</span></span>
<span class="line"><span>             man:systemd-getty-generator(8)</span></span>
<span class="line"><span>             http://0pointer.de/blog/projects/serial-console.html</span></span>
<span class="line"><span>   Main PID: 2069 (agetty)</span></span>
<span class="line"><span>      Tasks: 1 (limit: 47403)</span></span>
<span class="line"><span>     Memory: 200.0K</span></span>
<span class="line"><span>        CPU: 1ms</span></span>
<span class="line"><span>     CGroup: /system.slice/system-getty.slice/getty@tty1.service</span></span>
<span class="line"><span>             └─2069 /sbin/agetty -o &quot;-p -- \\\\u&quot; --noclear - linux</span></span></code></pre></div><h2 id="输入" tabindex="-1">输入 <a class="header-anchor" href="#输入" aria-label="Permalink to &quot;输入&quot;">​</a></h2><p>vnc或者控制台输入字符后，键盘驱动会发中断通知OS， 然后OS接收后发给激活的tty,tty有多个，但同一 时间只有一个处于激活状态。 <code>fg_console</code>表示激活tty的索引。 0表示tty1<br> 如下信息显示激活的tty是tty1, 同时console日志发往tty0(代表激活的tty)和ttyS0。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># cat /sys/devices/virtual/tty/console/active</span></span>
<span class="line"><span>tty0 ttyS0</span></span>
<span class="line"><span># cat /sys/devices/virtual/tty/tty0/active</span></span>
<span class="line"><span>tty1</span></span></code></pre></div><p>如下是输入字符&#39;r&#39;后典型的中断处理过程， k_self 的参数 up_flag 0 代表键盘down。通常会有两个中断， 另一个up_flag为1，表示键盘up. 篇幅有限，没列出来。<code>tty_flip_buffer_push</code>会将字符推到tty_port对应的 buf里， 然后异步使用工作队列处理buf里的数据。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[root@localhost ~]# ./efunc trace -e &quot;ps2_interrupt&quot; -a &quot;*tty*&quot; -a &quot;*kbd*&quot; -a &quot;k_*&quot; -a &quot;k_self(vc, vc-&gt;port.itty, vc-&gt;port.itty-&gt;name)&quot;</span></span>
<span class="line"><span>total 344 functions will be traced, entry: 1, child: 343</span></span>
<span class="line"><span>haveGetFuncIP: true</span></span>
<span class="line"><span>retOffset: 7</span></span>
<span class="line"><span>haveKprobeMulti:true</span></span>
<span class="line"><span>load ebpf and update maps take 351.407688ms</span></span>
<span class="line"><span>kprobe-multi sucessfully</span></span>
<span class="line"><span>kretprobe-multi sucessfully</span></span>
<span class="line"><span>Waiting for events..</span></span>
<span class="line"><span>TIME: 21:17:54.010571 -&gt; 21:17:54.010677 PID/TID: 0/0 (swapper/4 swapper/4)</span></span>
<span class="line"><span> CPU   DURATION | FUNCTION GRAPH</span></span>
<span class="line"><span> ---   -------- | --------------</span></span>
<span class="line"><span>  4)            | → ps2_interrupt serio=0xffff941a4132c800 data=19 flags=0</span></span>
<span class="line"><span>  4)    4.988µs |   ↔ atkbd_pre_receive_byte ps2dev=0xffff941a410d8800 data=19 flags=0 ret=PS2_PROCESS</span></span>
<span class="line"><span>  4)            |   → atkbd_receive_byte ps2dev=0xffff941a410d8800 data=19</span></span>
<span class="line"><span>  4)    1.536µs |     ↔ atkbd_event dev=0xffff941a410db000 type=4 code=4 value=19 ret=-1</span></span>
<span class="line"><span>  4)   16.176µs |     ↔ kbd_event handle=0xffff941a41140ea0 event_type=4 event_code=4 value=19 ret=void</span></span>
<span class="line"><span>  4)            |     → kbd_event handle=0xffff941a41140ea0 event_type=1 event_code=19 value=1</span></span>
<span class="line"><span>  4)            |       → kbd_keycode keycode=19 down=1 hw_raw=false</span></span>
<span class="line"><span>  4)            |         → k_self vc=0xffff941a40059800 value=114 /* r */ up_flag=0</span></span>
<span class="line"><span>                            vc = (struct vc_data *)0xffff941a40059800</span></span>
<span class="line"><span>                            vc-&gt;port.itty = (struct tty_struct *)0xffff941a49206000</span></span>
<span class="line"><span>                            vc-&gt;port.itty-&gt;name = (char[64]) &quot;tty1\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00&quot;</span></span>
<span class="line"><span>  4)            |           → k_unicode.part.0 rdi=0xffff941a40059800 rsi=0x72 rdx=0x72 rcx=0xf072 r8=0xffff941a49206000 r9=0xffff941c77133a80</span></span>
<span class="line"><span>  4)    8.736µs |             ↔ tty_flip_buffer_push port=0xffff941a40059800 ret=void</span></span>
<span class="line"><span>  4)   14.305µs |           ← k_unicode.part.0 rax=0x1</span></span>
<span class="line"><span>  4)     18.2µs |         ← k_self ret=void</span></span>
<span class="line"><span>  4)   25.421µs |       ← kbd_keycode ret=void</span></span>
<span class="line"><span>  4)   29.916µs |     ← kbd_event ret=void</span></span>
<span class="line"><span>  4)    1.377µs |     ↔ kbd_event handle=0xffff941a41140ea0 event_type=0 event_code=0 value=0 ret=void</span></span>
<span class="line"><span>  4)   75.219µs |   ← atkbd_receive_byte ret=void</span></span>
<span class="line"><span>  4)   91.471µs | ← ps2_interrupt ret=IRQ_HANDLED</span></span></code></pre></div><p>工作队列调用<code>flush_to_ldisc</code>，将数据放到tty_struct的buf里。在<code>__receive_buf</code>里最后一步，唤醒所有等待tty读的进程，这样用户态的进程就收到 字符<code>r</code>了</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[root@localhost ~]# ./efunc trace -e &#39;flush_to_ldisc(work, (struct tty_port *)(0,0,0,-8)-&gt;itty-&gt;name == &quot;tty1&quot;)&#39; -a &quot;:drivers/tty/*&quot;  -a &quot;n_tty_receive_char(tty-&gt;termios.c_lflag)&quot;</span></span>
<span class="line"><span>total 314 functions will be traced, entry: 1, child: 313</span></span>
<span class="line"><span>haveGetFuncIP: true</span></span>
<span class="line"><span>retOffset: 7</span></span>
<span class="line"><span>haveKprobeMulti:true</span></span>
<span class="line"><span>load ebpf and update maps take 343.469518ms</span></span>
<span class="line"><span>kprobe-multi sucessfully</span></span>
<span class="line"><span>kretprobe-multi sucessfully</span></span>
<span class="line"><span>Waiting for events..</span></span>
<span class="line"><span>TIME: 22:11:40.418019 -&gt; 22:11:40.418049 PID/TID: 477/477 (kworker/u37:2 kworker/u37:2)</span></span>
<span class="line"><span>CPU   DURATION | FUNCTION GRAPH</span></span>
<span class="line"><span>---   -------- | --------------</span></span>
<span class="line"><span>4)            | → flush_to_ldisc work=0xffff941a40059808</span></span>
<span class="line"><span>                  work = (struct work_struct *)0xffff941a40059808</span></span>
<span class="line"><span>                  ((struct tty_port *)(0,0,0,-8))-&gt;itty-&gt;name = (char[64]) &quot;tty1\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00&quot;</span></span>
<span class="line"><span>4)            |   → tty_port_default_receive_buf port=0xffff941a40059800 p=0xffff941a89926030 f=0x0 count=1</span></span>
<span class="line"><span>4)            |     → tty_ldisc_ref tty=0xffff941a49206000</span></span>
<span class="line"><span>4)    1.095µs |       ↔ ldsem_down_read_trylock sem=0xffff941a49206030 ret=1</span></span>
<span class="line"><span>4)    2.567µs |     ← tty_ldisc_ref ret=0xffff941a475eb6b0</span></span>
<span class="line"><span>4)            |     → tty_ldisc_receive_buf ld=0xffff941a475eb6b0 p=0xffff941a89926030 f=0x0 count=1</span></span>
<span class="line"><span>4)            |       → n_tty_receive_buf2 tty=0xffff941a49206000 cp=0xffff941a89926030 fp=0x0 count=1</span></span>
<span class="line"><span>4)            |         → n_tty_receive_buf_common tty=0xffff941a49206000 cp=0xffff941a89926030 fp=0x0 count=1 flow=true</span></span>
<span class="line"><span>4)            |           → __receive_buf tty=0xffff941a49206000 cp=0xffff941a89926030 fp=0x0 count=1</span></span>
<span class="line"><span>4)            |             → n_tty_receive_buf_standard tty=0xffff941a49206000 cp=0xffff941a89926030 fp=0x0 count=1 lookahead_done=false</span></span>
<span class="line"><span>4)      571ns |               ↔ n_tty_receive_char tty=0xffff941a49206000 c=114 /* r */ ret=void</span></span>
<span class="line"><span>                                tty-&gt;termios.c_lflag = (unsigned int)0</span></span>
<span class="line"><span>4)    1.972µs |             ← n_tty_receive_buf_standard ret=void</span></span>
<span class="line"><span>4)    13.64µs |           ← __receive_buf ret=void</span></span>
<span class="line"><span>4)   15.231µs |         ← n_tty_receive_buf_common ret=1</span></span>
<span class="line"><span>4)   16.563µs |       ← n_tty_receive_buf2 ret=1</span></span>
<span class="line"><span>4)   17.869µs |     ← tty_ldisc_receive_buf ret=1</span></span>
<span class="line"><span>4)            |     → tty_ldisc_deref ld=0xffff941a475eb6b0</span></span>
<span class="line"><span>4)      349ns |       ↔ ldsem_up_read sem=0xffff941a49206030 ret=void</span></span>
<span class="line"><span>4)    1.663µs |     ← tty_ldisc_deref ret=void</span></span>
<span class="line"><span>4)   25.908µs |   ← tty_port_default_receive_buf ret=1</span></span>
<span class="line"><span>4)   28.611µs | ← flush_to_ldisc ret=void</span></span>
<span class="line"><span></span></span>
<span class="line"><span>process_one_work+0x197</span></span>
<span class="line"><span>worker_thread+0x2fe</span></span>
<span class="line"><span>kthread+0xe0</span></span>
<span class="line"><span>ret_from_fork+0x2c</span></span></code></pre></div><h2 id="输出" tabindex="-1">输出 <a class="header-anchor" href="#输出" aria-label="Permalink to &quot;输出&quot;">​</a></h2><p>往tty里写字符的大致流程如下</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[root@localhost ~]# ./efunc trace -e &quot;con_write&quot; -a &quot;:drivers/tty/*/*&quot; -a &quot;*fb*&quot;</span></span>
<span class="line"><span>total 601 functions will be traced, entry: 1, child: 600</span></span>
<span class="line"><span>haveGetFuncIP: true</span></span>
<span class="line"><span>retOffset: 7</span></span>
<span class="line"><span>haveKprobeMulti:true</span></span>
<span class="line"><span>load ebpf and update maps take 346.852402ms</span></span>
<span class="line"><span>kprobe-multi sucessfully</span></span>
<span class="line"><span>kretprobe-multi sucessfully</span></span>
<span class="line"><span>Waiting for events..</span></span>
<span class="line"><span>TIME: 22:48:10.997324 -&gt; 22:48:10.997373 PID/TID: 33697/33697 (agetty agetty)</span></span>
<span class="line"><span> CPU   DURATION | FUNCTION GRAPH</span></span>
<span class="line"><span> ---   -------- | --------------</span></span>
<span class="line"><span>  1)            | → con_write tty=0xffff941a49206000 buf=0xffff941a51721c00 count=1</span></span>
<span class="line"><span>  1)            |   → do_con_write tty=0xffff941a49206000 buf=0xffff941a51721c00 count=1</span></span>
<span class="line"><span>  1)            |     → hide_cursor vc=0xffff941a40059800</span></span>
<span class="line"><span>  1)      955ns |       ↔ vc_is_sel vc=0xffff941a40059800 ret=false</span></span>
<span class="line"><span>  1)            |       → fbcon_cursor vc=0xffff941a40059800 mode=2</span></span>
<span class="line"><span>  1)      416ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24</span></span>
<span class="line"><span>  1)      303ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24</span></span>
<span class="line"><span>  1)      301ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24</span></span>
<span class="line"><span>  1)      354ns |         ↔ fb_get_buffer_offset info=0xffff941a4919fc00 buf=0xffff941a4919fdd0 size=16 ret=0xffff941a44477560</span></span>
<span class="line"><span>  1)      656ns |         ↔ fb_pad_aligned_buffer dst=0xffff941a44477560 d_pitch=1 src=0xffff941a46aa2fb0 s_pitch=1 height=16 ret=void</span></span>
<span class="line"><span>  1)    8.789µs |       ← fbcon_cursor ret=void</span></span>
<span class="line"><span>  1)   12.112µs |     ← hide_cursor ret=void</span></span>
<span class="line"><span>  1)            |     → vc_con_write_normal vc=0xffff941a40059800 tc=114 c=114 draw=0xffffb58a86f77a38</span></span>
<span class="line"><span>  1)    1.189µs |       ↔ conv_uni_to_pc conp=0xffff941a40059800 ucs=114 ret=114</span></span>
<span class="line"><span>  1)    2.765µs |     ← vc_con_write_normal ret=0</span></span>
<span class="line"><span>  1)            |     → fbcon_putcs vc=0xffff941a40059800 s=0xffff941a445fc8e8 count=1 ypos=7 xpos=20</span></span>
<span class="line"><span>  1)      305ns |       ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24</span></span>
<span class="line"><span>  1)      299ns |       ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24</span></span>
<span class="line"><span>  1)      296ns |       ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24</span></span>
<span class="line"><span>  1)      300ns |       ↔ fb_get_buffer_offset info=0xffff941a4919fc00 buf=0xffff941a4919fdd0 size=16 ret=0xffff941a44477570</span></span>
<span class="line"><span>  1)    3.952µs |     ← fbcon_putcs ret=void</span></span>
<span class="line"><span>  1)   23.664µs |   ← do_con_write ret=1</span></span>
<span class="line"><span>  1)            |   → con_flush_chars tty=0xffff941a49206000</span></span>
<span class="line"><span>  1)            |     → set_cursor vc=0xffff941a40059800</span></span>
<span class="line"><span>  1)      302ns |       ↔ vc_is_sel vc=0xffff941a40059800 ret=false</span></span>
<span class="line"><span>  1)      392ns |       ↔ add_softcursor vc=0xffff941a40059800 ret=void</span></span>
<span class="line"><span>  1)            |       → fbcon_cursor vc=0xffff941a40059800 mode=1</span></span>
<span class="line"><span>  1)      298ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24</span></span>
<span class="line"><span>  1)      299ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24</span></span>
<span class="line"><span>  1)      302ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24</span></span>
<span class="line"><span>  1)      297ns |         ↔ fb_get_buffer_offset info=0xffff941a4919fc00 buf=0xffff941a4919fdd0 size=16 ret=0xffff941a44477580</span></span>
<span class="line"><span>  1)      330ns |         ↔ fb_pad_aligned_buffer dst=0xffff941a44477580 d_pitch=1 src=0xffff941a46aa2fb0 s_pitch=1 height=16 ret=void</span></span>
<span class="line"><span>  1)    4.586µs |       ← fbcon_cursor ret=void</span></span>
<span class="line"><span>  1)     7.16µs |     ← set_cursor ret=void</span></span>
<span class="line"><span>  1)    8.325µs |   ← con_flush_chars ret=void</span></span>
<span class="line"><span>  1)   34.426µs | ← con_write ret=1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>process_output_block+0x8d</span></span>
<span class="line"><span>n_tty_write+0x198</span></span>
<span class="line"><span>iterate_tty_write+0x11f</span></span>
<span class="line"><span>file_tty_write.constprop.0+0x7f</span></span>
<span class="line"><span>vfs_write+0x2ce</span></span>
<span class="line"><span>ksys_write+0x5f</span></span>
<span class="line"><span>do_syscall_64+0x5f</span></span>
<span class="line"><span>entry_SYSCALL_64_after_hwframe+0x78</span></span></code></pre></div>`,13),f=[t];function l(c,i,o,r,x,_){return n(),a("div",null,f)}const v=s(e,[["render",l]]);export{u as __pageData,v as default};
