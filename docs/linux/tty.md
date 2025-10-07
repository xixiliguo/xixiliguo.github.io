

## tty相关知识
`agetty`监控`/dev/tty1`, 当输入字符+换行符后通过`execve`启动login进程，然后加载配置和pam动态库，
输入密码鉴权成功后，fork bash进程接管/dev/tty1, 后续所有tty输入输出都会和bash进程交互。通过
`strace -ftT -o abc.txt -p [agetty pid]`能观察到所有细节。
```
# systemctl status getty@tty1.service
● getty@tty1.service - Getty on tty1
     Loaded: loaded (/usr/lib/systemd/system/getty@.service; enabled; preset: enabled)
     Active: active (running) since Sun 2025-07-06 19:13:43 CST; 34s ago
       Docs: man:agetty(8)
             man:systemd-getty-generator(8)
             http://0pointer.de/blog/projects/serial-console.html
   Main PID: 2069 (agetty)
      Tasks: 1 (limit: 47403)
     Memory: 200.0K
        CPU: 1ms
     CGroup: /system.slice/system-getty.slice/getty@tty1.service
             └─2069 /sbin/agetty -o "-p -- \\u" --noclear - linux
```

## 输入
vnc或者控制台输入字符后，键盘驱动会发中断通知OS， 然后OS接收后发给激活的tty,tty有多个，但同一
时间只有一个处于激活状态。 `fg_console`表示激活tty的索引。 0表示tty1  
如下信息显示激活的tty是tty1, 同时console日志发往tty0(代表激活的tty)和ttyS0。
```
# cat /sys/devices/virtual/tty/console/active
tty0 ttyS0
# cat /sys/devices/virtual/tty/tty0/active
tty1
```
如下是输入字符'r'后典型的中断处理过程， k_self 的参数 up_flag 0 代表键盘down。通常会有两个中断， 
另一个up_flag为1，表示键盘up. 篇幅有限，没列出来。`tty_flip_buffer_push`会将字符推到tty_port对应的
buf里， 然后异步使用工作队列处理buf里的数据。
```
[root@localhost ~]# ./efunc trace -e "ps2_interrupt" -a "*tty*" -a "*kbd*" -a "k_*" -a "k_self(vc, vc->port.itty, vc->port.itty->name)"
total 344 functions will be traced, entry: 1, child: 343
haveGetFuncIP: true
retOffset: 7
haveKprobeMulti:true
load ebpf and update maps take 351.407688ms
kprobe-multi sucessfully
kretprobe-multi sucessfully
Waiting for events..
TIME: 21:17:54.010571 -> 21:17:54.010677 PID/TID: 0/0 (swapper/4 swapper/4)
 CPU   DURATION | FUNCTION GRAPH
 ---   -------- | --------------
  4)            | → ps2_interrupt serio=0xffff941a4132c800 data=19 flags=0
  4)    4.988µs |   ↔ atkbd_pre_receive_byte ps2dev=0xffff941a410d8800 data=19 flags=0 ret=PS2_PROCESS
  4)            |   → atkbd_receive_byte ps2dev=0xffff941a410d8800 data=19
  4)    1.536µs |     ↔ atkbd_event dev=0xffff941a410db000 type=4 code=4 value=19 ret=-1
  4)   16.176µs |     ↔ kbd_event handle=0xffff941a41140ea0 event_type=4 event_code=4 value=19 ret=void
  4)            |     → kbd_event handle=0xffff941a41140ea0 event_type=1 event_code=19 value=1
  4)            |       → kbd_keycode keycode=19 down=1 hw_raw=false
  4)            |         → k_self vc=0xffff941a40059800 value=114 /* r */ up_flag=0
                            vc = (struct vc_data *)0xffff941a40059800
                            vc->port.itty = (struct tty_struct *)0xffff941a49206000
                            vc->port.itty->name = (char[64]) "tty1\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
  4)            |           → k_unicode.part.0 rdi=0xffff941a40059800 rsi=0x72 rdx=0x72 rcx=0xf072 r8=0xffff941a49206000 r9=0xffff941c77133a80
  4)    8.736µs |             ↔ tty_flip_buffer_push port=0xffff941a40059800 ret=void
  4)   14.305µs |           ← k_unicode.part.0 rax=0x1
  4)     18.2µs |         ← k_self ret=void
  4)   25.421µs |       ← kbd_keycode ret=void
  4)   29.916µs |     ← kbd_event ret=void
  4)    1.377µs |     ↔ kbd_event handle=0xffff941a41140ea0 event_type=0 event_code=0 value=0 ret=void
  4)   75.219µs |   ← atkbd_receive_byte ret=void
  4)   91.471µs | ← ps2_interrupt ret=IRQ_HANDLED
  ```

工作队列调用`flush_to_ldisc`，将数据放到tty_struct的buf里。在`__receive_buf`里最后一步，唤醒所有等待tty读的进程，这样用户态的进程就收到
字符`r`了
  ```
[root@localhost ~]# ./efunc trace -e 'flush_to_ldisc(work, (struct tty_port *)(0,0,0,-8)->itty->name == "tty1")' -a ":drivers/tty/*"  -a "n_tty_receive_char(tty->termios.c_lflag)"
total 314 functions will be traced, entry: 1, child: 313
haveGetFuncIP: true
retOffset: 7
haveKprobeMulti:true
load ebpf and update maps take 343.469518ms
kprobe-multi sucessfully
kretprobe-multi sucessfully
Waiting for events..
TIME: 22:11:40.418019 -> 22:11:40.418049 PID/TID: 477/477 (kworker/u37:2 kworker/u37:2)
 CPU   DURATION | FUNCTION GRAPH
 ---   -------- | --------------
  4)            | → flush_to_ldisc work=0xffff941a40059808
                    work = (struct work_struct *)0xffff941a40059808
                    ((struct tty_port *)(0,0,0,-8))->itty->name = (char[64]) "tty1\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
  4)            |   → tty_port_default_receive_buf port=0xffff941a40059800 p=0xffff941a89926030 f=0x0 count=1
  4)            |     → tty_ldisc_ref tty=0xffff941a49206000
  4)    1.095µs |       ↔ ldsem_down_read_trylock sem=0xffff941a49206030 ret=1
  4)    2.567µs |     ← tty_ldisc_ref ret=0xffff941a475eb6b0
  4)            |     → tty_ldisc_receive_buf ld=0xffff941a475eb6b0 p=0xffff941a89926030 f=0x0 count=1
  4)            |       → n_tty_receive_buf2 tty=0xffff941a49206000 cp=0xffff941a89926030 fp=0x0 count=1
  4)            |         → n_tty_receive_buf_common tty=0xffff941a49206000 cp=0xffff941a89926030 fp=0x0 count=1 flow=true
  4)            |           → __receive_buf tty=0xffff941a49206000 cp=0xffff941a89926030 fp=0x0 count=1
  4)            |             → n_tty_receive_buf_standard tty=0xffff941a49206000 cp=0xffff941a89926030 fp=0x0 count=1 lookahead_done=false
  4)      571ns |               ↔ n_tty_receive_char tty=0xffff941a49206000 c=114 /* r */ ret=void
                                  tty->termios.c_lflag = (unsigned int)0
  4)    1.972µs |             ← n_tty_receive_buf_standard ret=void
  4)    13.64µs |           ← __receive_buf ret=void
  4)   15.231µs |         ← n_tty_receive_buf_common ret=1
  4)   16.563µs |       ← n_tty_receive_buf2 ret=1
  4)   17.869µs |     ← tty_ldisc_receive_buf ret=1
  4)            |     → tty_ldisc_deref ld=0xffff941a475eb6b0
  4)      349ns |       ↔ ldsem_up_read sem=0xffff941a49206030 ret=void
  4)    1.663µs |     ← tty_ldisc_deref ret=void
  4)   25.908µs |   ← tty_port_default_receive_buf ret=1
  4)   28.611µs | ← flush_to_ldisc ret=void

process_one_work+0x197
worker_thread+0x2fe
kthread+0xe0
ret_from_fork+0x2c
```

## 输出

往tty里写字符的大致流程如下
```
[root@localhost ~]# ./efunc trace -e "con_write" -a ":drivers/tty/*/*" -a "*fb*"
total 601 functions will be traced, entry: 1, child: 600
haveGetFuncIP: true
retOffset: 7
haveKprobeMulti:true
load ebpf and update maps take 346.852402ms
kprobe-multi sucessfully
kretprobe-multi sucessfully
Waiting for events..
TIME: 22:48:10.997324 -> 22:48:10.997373 PID/TID: 33697/33697 (agetty agetty)
 CPU   DURATION | FUNCTION GRAPH
 ---   -------- | --------------
  1)            | → con_write tty=0xffff941a49206000 buf=0xffff941a51721c00 count=1
  1)            |   → do_con_write tty=0xffff941a49206000 buf=0xffff941a51721c00 count=1
  1)            |     → hide_cursor vc=0xffff941a40059800
  1)      955ns |       ↔ vc_is_sel vc=0xffff941a40059800 ret=false
  1)            |       → fbcon_cursor vc=0xffff941a40059800 mode=2
  1)      416ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24
  1)      303ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24
  1)      301ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24
  1)      354ns |         ↔ fb_get_buffer_offset info=0xffff941a4919fc00 buf=0xffff941a4919fdd0 size=16 ret=0xffff941a44477560
  1)      656ns |         ↔ fb_pad_aligned_buffer dst=0xffff941a44477560 d_pitch=1 src=0xffff941a46aa2fb0 s_pitch=1 height=16 ret=void
  1)    8.789µs |       ← fbcon_cursor ret=void
  1)   12.112µs |     ← hide_cursor ret=void
  1)            |     → vc_con_write_normal vc=0xffff941a40059800 tc=114 c=114 draw=0xffffb58a86f77a38
  1)    1.189µs |       ↔ conv_uni_to_pc conp=0xffff941a40059800 ucs=114 ret=114
  1)    2.765µs |     ← vc_con_write_normal ret=0
  1)            |     → fbcon_putcs vc=0xffff941a40059800 s=0xffff941a445fc8e8 count=1 ypos=7 xpos=20
  1)      305ns |       ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24
  1)      299ns |       ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24
  1)      296ns |       ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24
  1)      300ns |       ↔ fb_get_buffer_offset info=0xffff941a4919fc00 buf=0xffff941a4919fdd0 size=16 ret=0xffff941a44477570
  1)    3.952µs |     ← fbcon_putcs ret=void
  1)   23.664µs |   ← do_con_write ret=1
  1)            |   → con_flush_chars tty=0xffff941a49206000
  1)            |     → set_cursor vc=0xffff941a40059800
  1)      302ns |       ↔ vc_is_sel vc=0xffff941a40059800 ret=false
  1)      392ns |       ↔ add_softcursor vc=0xffff941a40059800 ret=void
  1)            |       → fbcon_cursor vc=0xffff941a40059800 mode=1
  1)      298ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24
  1)      299ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24
  1)      302ns |         ↔ fb_get_color_depth var=0xffff941a4919fc50 fix=0xffff941a4919fcf0 ret=24
  1)      297ns |         ↔ fb_get_buffer_offset info=0xffff941a4919fc00 buf=0xffff941a4919fdd0 size=16 ret=0xffff941a44477580
  1)      330ns |         ↔ fb_pad_aligned_buffer dst=0xffff941a44477580 d_pitch=1 src=0xffff941a46aa2fb0 s_pitch=1 height=16 ret=void
  1)    4.586µs |       ← fbcon_cursor ret=void
  1)     7.16µs |     ← set_cursor ret=void
  1)    8.325µs |   ← con_flush_chars ret=void
  1)   34.426µs | ← con_write ret=1

process_output_block+0x8d
n_tty_write+0x198
iterate_tty_write+0x11f
file_tty_write.constprop.0+0x7f
vfs_write+0x2ce
ksys_write+0x5f
do_syscall_64+0x5f
entry_SYSCALL_64_after_hwframe+0x78
```