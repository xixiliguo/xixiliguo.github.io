import{_ as s,c as i,o as a,a2 as n}from"./chunks/framework.BufN96s7.js";const F=JSON.parse('{"title":"Linux: Trap","description":"","frontmatter":{"title":"Linux: Trap","date":"2021-03-20T13:45:56.000Z","draft":false},"headers":[],"relativePath":"kernel/linux-trap.md","filePath":"kernel/linux-trap.md","lastUpdated":1721229891000}'),t={name:"kernel/linux-trap.md"},h=n(`<p>记录一些关于内核处理异常,trap等的机制</p><h1 id="内核关于segment-fault的打印" tabindex="-1">内核关于segment fault的打印 <a class="header-anchor" href="#内核关于segment-fault的打印" aria-label="Permalink to &quot;内核关于segment fault的打印&quot;">​</a></h1><div class="language-c vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">c</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">#include</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &lt;stdio.h&gt;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">int</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> main</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">int</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;"> argc</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">char</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> **</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">argv</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">   int</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">p </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> 0x</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">   return</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> printf</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%d\\n</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">p);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>上述代码中p为空指针, 访问它会触发segment fault, 系统日志会打印如下:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[Sat Mar 20 17:12:52 2021] a.out[40342]: segfault at 0 ip 00000000004005b1 sp 00007ffc5b1be400 error 4 in a.out[400000+1000]</span></span></code></pre></div><p>对应x86的处理代码:</p><div class="language-c vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">c</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">	printk</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%s%s</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">[</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%d</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">]: segfault at </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%lx</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ip </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%p</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">x sp </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%p</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">x error </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%lx</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">		loglvl, tsk</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">-&gt;</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">comm</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">task_pid_nr</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(tsk), address,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">		(</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">void</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)regs</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">-&gt;</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">ip</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, (</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">void</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)regs</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">-&gt;</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">sp</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, error_code);</span></span></code></pre></div><p>at 要具体要访问的内存地址<br> ip 当前的执行指令的地址. 即寄存器<code>rip</code>的值<br> sp 栈地址<br> error page fault触发后生成的, 具体对应x86下面的含义可用以下代码解析.</p><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">package</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> main</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">import</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">fmt</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> * x86 Page fault error code bits:</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> *</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> *   bit 0 ==	 0: no page found	1: protection fault</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> *   bit 1 ==	 0: read access		1: write access</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> *   bit 2 ==	 0: kernel-mode access	1: user-mode access</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> *   bit 3 ==				1: use of reserved bit detected</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> *   bit 4 ==				1: fault was an instruction fetch</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> *   bit 5 ==				1: protection keys block access</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> */</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> errorDesc [][]</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [][]</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	{</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;no page found&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;protection fault&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">},</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	{</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;read access&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;write access&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">},</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	{</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;kernel-mode access&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;user-mode access&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">},</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	{</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;use of reserved bit detected&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">},</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	{</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;use of reserved bit detected&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">},</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	{</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;protection keys block access&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">},</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">func</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> main</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">() {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	errorCode </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 14</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">	for</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> i </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">; i </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">&lt;</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 6</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">; i</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">++</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">		desc </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> errorDesc[i][errorCode</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">&gt;&gt;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">i</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">&amp;</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">		if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> desc </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">!=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">			fmt.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Println</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(desc)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">		}</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>in 后面跟执行指令当前位于哪个文件(可能是主程序文件,也可能是动态库)和该文件在内存中加载的地址</p><p>参考:<br><a href="https://stackoverflow.com/questions/2549214/interpreting-segfault-messages" target="_blank" rel="noreferrer">https://stackoverflow.com/questions/2549214/interpreting-segfault-messages</a></p>`,11),p=[h];function k(l,e,r,E,d,g){return a(),i("div",null,p)}const c=s(t,[["render",k]]);export{F as __pageData,c as default};
