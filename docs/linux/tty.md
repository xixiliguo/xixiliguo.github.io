

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

