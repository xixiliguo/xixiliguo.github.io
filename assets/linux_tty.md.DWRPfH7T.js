import{_ as s,c as a,o as t,a2 as e}from"./chunks/framework.KQnwS2KS.js";const u=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"linux/tty.md","filePath":"linux/tty.md","lastUpdated":1751815654000}'),n={name:"linux/tty.md"},p=e(`<h2 id="tty相关知识" tabindex="-1">tty相关知识 <a class="header-anchor" href="#tty相关知识" aria-label="Permalink to &quot;tty相关知识&quot;">​</a></h2><p><code>agetty</code>监控<code>/dev/tty1</code>, 当输入字符+换行符后通过<code>execve</code>启动login进程，然后加载配置和pam动态库， 输入密码鉴权成功后，fork bash进程接管/dev/tty1, 后续所有tty输入输出都会和bash进程交互。通过 <code>strace -ftT -o abc.txt -p [agetty pid]</code>能观察到所有细节。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># systemctl status getty@tty1.service</span></span>
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
<span class="line"><span>             └─2069 /sbin/agetty -o &quot;-p -- \\\\u&quot; --noclear - linux</span></span></code></pre></div>`,3),c=[p];function l(i,o,d,r,y,_){return t(),a("div",null,c)}const g=s(n,[["render",l]]);export{u as __pageData,g as default};
