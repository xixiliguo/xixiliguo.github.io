import{_ as s,c as a,o as n,a2 as p}from"./chunks/framework.YBtj1D-X.js";const u=JSON.parse('{"title":"Linux /etc/shadow 文件学习笔记","description":"","frontmatter":{"title":"Linux /etc/shadow 文件学习笔记","author":"Peter Wang","tags":["linux","shadow","crypt"],"date":"2017-10-11T14:11:23.000Z","draft":false},"headers":[],"relativePath":"linux/linux-shadow.md","filePath":"linux/linux-shadow.md","lastUpdated":1736093172000}'),i={name:"linux/linux-shadow.md"},t=p(`<p>Linux系统下，创建的用户信息如ID，家目录，默认shell保存在/etc/passwd下，该文件每行的第二位（以冒号分隔）表示密码。但真正的密码其实被加密后放在/etc/shadow里，/etc/passwd里只显示为x。本文主要介绍shadow文件各字段含义和相关的密码生命周期配置。</p><p>本文内使用的Linux环境是centos7.3, 操作时间是2017年10月12号</p><h1 id="字段介绍" tabindex="-1">字段介绍 <a class="header-anchor" href="#字段介绍" aria-label="Permalink to &quot;字段介绍&quot;">​</a></h1><p>/etc/shadow每行和/etc/passwd一一对应，命令<code>pwconv</code>根据/etc/passwd生成。每行由9个字段（以冒号分隔）组成，如下是每个字段的含义：</p><h2 id="_1-登录名" tabindex="-1">1. 登录名: <a class="header-anchor" href="#_1-登录名" aria-label="Permalink to &quot;1. 登录名:&quot;">​</a></h2><p>如 root， 通过它，唯一匹配/etc/passwd中的一行</p><h2 id="_2-加密后的密码" tabindex="-1">2. 加密后的密码： <a class="header-anchor" href="#_2-加密后的密码" aria-label="Permalink to &quot;2. 加密后的密码：&quot;">​</a></h2><p>通常的格式为: $X$ZZZZZZ<br> X为数字，表示不同的加密算法，具体如下：</p><table tabindex="0"><thead><tr><th style="text-align:left;">ID</th><th style="text-align:left;">Method</th></tr></thead><tbody><tr><td style="text-align:left;">1</td><td style="text-align:left;">MD5</td></tr><tr><td style="text-align:left;">2a</td><td style="text-align:left;">Blowfish</td></tr><tr><td style="text-align:left;">5</td><td style="text-align:left;">SHA-256</td></tr><tr><td style="text-align:left;">6</td><td style="text-align:left;">SHA-512</td></tr></tbody></table><p>第二个星号后面的ZZZZ为加密后的密文, 具体是通过glibc里的crypt函数来实现加密。文章最后会提供一段程序，通过盐值来加密明文。可以通过<code>man 3 crypt</code>了解函数使用方法</p><p>如果该字段 是 ! 或者 *， 表示该用户无法用密码登录系统.但可以通过其他方式登录。<br> 如果该字段以感叹号!开头，其余是通常的格式，则系统认为密码被锁， ssh登录时即使输入正确的密码，也会拒绝登录. <code>usermod -L username</code> 就是使用该原理。<code>usermod -U username</code> 功能是解锁</p><h2 id="_3-密码最后修改时间" tabindex="-1">3. 密码最后修改时间： <a class="header-anchor" href="#_3-密码最后修改时间" aria-label="Permalink to &quot;3. 密码最后修改时间：&quot;">​</a></h2><p>通过<code>chage -d XX user</code>可以设置该字段<br> 值为从1970 1月1号至改密码时的天数。<br> 0表示用户需要在下次登录时修改密码<br> 空值表示关闭密码有效期功能，即密码永远有效<br> 如下是设置为0时的系统行为</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[root@linux /root]# grep test /etc/shadow</span></span>
<span class="line"><span>test:$6$IFqUZWcW$lEDn9cLw:17450:0:99999:7:::</span></span>
<span class="line"><span>[root@linux /root]# chage -d 0 test</span></span>
<span class="line"><span>[root@linux /root]# grep test /etc/shadow</span></span>
<span class="line"><span>test:$6$IFqUZWcW$lEDn9cLw:0:0:99999:7:::</span></span>
<span class="line"><span></span></span>
<span class="line"><span>$ ssh test@XX.XX.XX.XX</span></span>
<span class="line"><span>test@XX.XX.XX.XX&#39;s password:</span></span>
<span class="line"><span>You are required to change your password immediately (root enforced)</span></span>
<span class="line"><span>Last login: Wed Oct 11 23:09:07 2017 from XX.XX.XX.XX</span></span>
<span class="line"><span>WARNING: Your password has expired.</span></span>
<span class="line"><span>You must change your password now and login again!</span></span>
<span class="line"><span>Changing password for user test.</span></span>
<span class="line"><span>Changing password for test.</span></span>
<span class="line"><span>(current) UNIX password:</span></span>
<span class="line"><span>New password:</span></span>
<span class="line"><span>Retype new password:</span></span>
<span class="line"><span>passwd: all authentication tokens updated successfully.</span></span>
<span class="line"><span>Connection to XX.XX.XX.XX closed.</span></span>
<span class="line"><span>$</span></span>
<span class="line"><span>然后用新密码就可以登录了， 这个可以用于管理员强制普通用户修改密码</span></span></code></pre></div><h2 id="_4-最小时间间隔" tabindex="-1">4. 最小时间间隔： <a class="header-anchor" href="#_4-最小时间间隔" aria-label="Permalink to &quot;4. 最小时间间隔：&quot;">​</a></h2><p>通过<code>chage -m XXX user</code>可以设置该字段<br> 两次修改口令之间所需的最小天数。<br> 空或者0表示没有限制</p><h2 id="_5-最大时间间隔" tabindex="-1">5. 最大时间间隔： <a class="header-anchor" href="#_5-最大时间间隔" aria-label="Permalink to &quot;5. 最大时间间隔：&quot;">​</a></h2><p>通过<code>chage -M XXX user</code>可以设置该字段<br> 两次修改口令之间所需的最大天数。一旦超过，意味着密码过期.<br> 空表示没有限制.</p><p>如果该值小于最小时间间隔，则用户无法修改密码,如下演示其行为:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[root@linux /root]# grep test /etc/shadow</span></span>
<span class="line"><span>test:$6$xxFzM1X0$GzIbWsFIqhhcJ:17450:5:4:7:::</span></span>
<span class="line"><span>[root@linux /root]#</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[test@linux ~]$ passwd</span></span>
<span class="line"><span>Changing password for user test.</span></span>
<span class="line"><span>Changing password for test.</span></span>
<span class="line"><span>(current) UNIX password:</span></span>
<span class="line"><span>You must wait longer to change your password</span></span>
<span class="line"><span>passwd: Authentication token manipulation error</span></span></code></pre></div><h2 id="_6-警告天数" tabindex="-1">6. 警告天数： <a class="header-anchor" href="#_6-警告天数" aria-label="Permalink to &quot;6. 警告天数：&quot;">​</a></h2><p>通过<code>chage -W XXX user</code>可以设置该字段<br> 在密码过期前（即 密码最后修改时间 + 最大时间间隔），提前多少天通知用户. 此时仍可以正常登陆，只是多了一行提示<br> 空或者0表示无警告.<br> 如下演示告警信息:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[root@linux /root]# grep test /etc/shadow</span></span>
<span class="line"><span>test:$6$xxFzM1X0$GzIbWsFIqhh:17450:0:6:7:::</span></span>
<span class="line"><span>[root@linux /root]#</span></span>
<span class="line"><span>$ ssh test@XX.XX.XX.XX</span></span>
<span class="line"><span>test@XX.XX.XX.XX&#39;s password:</span></span>
<span class="line"><span>Warning: your password will expire in 6 days</span></span>
<span class="line"><span>Last login: Wed Oct 11 23:36:04 2017 from XX.XX.XX.XX</span></span>
<span class="line"><span>[test@linux ~]$</span></span></code></pre></div><h2 id="_7-非活动周期" tabindex="-1">7. 非活动周期: <a class="header-anchor" href="#_7-非活动周期" aria-label="Permalink to &quot;7. 非活动周期:&quot;">​</a></h2><p>通过<code>chage -I XXX user</code>可以设置该字段<br> 表示密码过期后，多少天内用户仍可以正常登陆，但要求立即修改密码。 一旦超过该天数，系统会拒绝用户登陆<br> 空值或者0表示没有非活动期，一旦密码过期直接拒绝登陆</p><p>如下演示进入非活动期</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[root@linux /root]# chage -l test</span></span>
<span class="line"><span>Last password change					: Oct 01, 2017</span></span>
<span class="line"><span>Password expires					: Oct 02, 2017</span></span>
<span class="line"><span>Password inactive					: Nov 01, 2017</span></span>
<span class="line"><span>Account expires						: never</span></span>
<span class="line"><span>Minimum number of days between password change		: 0</span></span>
<span class="line"><span>Maximum number of days between password change		: 1</span></span>
<span class="line"><span>Number of days of warning before password expires	: 7</span></span>
<span class="line"><span>[root@linux /root]# grep test /etc/shadow</span></span>
<span class="line"><span>test:$6$xxFzM1X0$GzIbWsFIqhhcJ:17440:0:1:7:30::</span></span>
<span class="line"><span>$ ssh test@XX.XX.XX.XX</span></span>
<span class="line"><span>test@XX.XX.XX.XX&#39;s password:</span></span>
<span class="line"><span>You are required to change your password immediately (password aged)</span></span>
<span class="line"><span>Last login: Wed Oct 11 23:51:05 2017 from XX.XX.XX.XX</span></span>
<span class="line"><span>WARNING: Your password has expired.</span></span>
<span class="line"><span>You must change your password now and login again!</span></span>
<span class="line"><span>Changing password for user test.</span></span>
<span class="line"><span>Changing password for test.</span></span>
<span class="line"><span>(current) UNIX password:</span></span>
<span class="line"><span>New password:</span></span>
<span class="line"><span>Retype new password:</span></span>
<span class="line"><span>passwd: all authentication tokens updated successfully.</span></span>
<span class="line"><span>Connection to XX.XX.XX.XX closed.</span></span></code></pre></div><p>如下演示超过非活动期:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[root@linux /root]# chage -l test</span></span>
<span class="line"><span>Last password change					: Oct 01, 2017</span></span>
<span class="line"><span>Password expires					: Oct 02, 2017</span></span>
<span class="line"><span>Password inactive					: Oct 02, 2017</span></span>
<span class="line"><span>Account expires						: never</span></span>
<span class="line"><span>Minimum number of days between password change		: 0</span></span>
<span class="line"><span>Maximum number of days between password change		: 1</span></span>
<span class="line"><span>Number of days of warning before password expires	: 7</span></span>
<span class="line"><span>[root@linux /root]# grep test /etc/shadow</span></span>
<span class="line"><span>test:$6$wODB1.oE$39TBytc.5y0OkKn:17440:0:1:7:0::</span></span>
<span class="line"><span>$ ssh test@10.211.55.9</span></span>
<span class="line"><span>test@10.211.55.9&#39;s password:</span></span>
<span class="line"><span>Your account has expired; please contact your system administrator</span></span>
<span class="line"><span>Connection closed by 10.211.55.9</span></span></code></pre></div><h2 id="_8-用户过期时间" tabindex="-1">8. 用户过期时间： <a class="header-anchor" href="#_8-用户过期时间" aria-label="Permalink to &quot;8. 用户过期时间：&quot;">​</a></h2><p>通过<code>chage -E XXX user</code>可以设置该字段<br> 用户过期时间，值表示为自19701月1号起的天数.<br> 密码过期后，用户只是无法使用密码登陆，还可以用其他方式。 一旦用户过期，任何方式都无法用该用户登陆<br> 空值表示永远不会过期<br> 0值不建议使用。解释取决于程序本身</p><h2 id="_9-其他为保留字段-为将来扩展功能用" tabindex="-1">9. 其他为保留字段，为将来扩展功能用 <a class="header-anchor" href="#_9-其他为保留字段-为将来扩展功能用" aria-label="Permalink to &quot;9. 其他为保留字段，为将来扩展功能用&quot;">​</a></h2><h2 id="自己写代码实现加密-c-和-python实现" tabindex="-1">自己写代码实现加密(C 和 Python实现) <a class="header-anchor" href="#自己写代码实现加密-c-和-python实现" aria-label="Permalink to &quot;自己写代码实现加密(C 和 Python实现)&quot;">​</a></h2><div class="language-c vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">c</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">#include</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &lt;crypt.h&gt;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">#include</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &lt;stdio.h&gt;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">int</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> main</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">int</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;"> argc</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">char</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">argv</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">[]</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(argc</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">!=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">3</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        return</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> -</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    char</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">buf </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> crypt</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">((</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">const</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> char</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">argv</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">], (</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">const</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> char</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">argv</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">2</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]);</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">    printf</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;salt: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%s</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">, crypt: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%s\\n</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">argv</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">2</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">], buf);</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    return</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>#gcc -g a.c -lcrypt  </span></span>
<span class="line"><span>#grep root /etc/shadow  </span></span>
<span class="line"><span>root:$6$DEgVEU0T$mwlTGb/nTtvpIJcoIy2t9xNMgv0.IT34WLvQ7VmbWJP9rU8Ysp9JyJ8I8PxEleGPWoirdbk4VKbhtCg6P.sm1.:17450:0:99999:7:::  </span></span>
<span class="line"><span>#./a.out abc \\$6\\$DEgVEU0T  </span></span>
<span class="line"><span>salt: $6$DEgVEU0T, crypt: $6$DEgVEU0T$mwlTGb/nTtvpIJcoIy2t9xNMgv0.IT34WLvQ7VmbWJP9rU8Ysp9JyJ8I8PxEleGPWoirdbk4VKbhtCg6P.sm1.</span></span></code></pre></div><p>Python 2.7 自带crypt模块，它是C库 crypt的binding， 实现更简单。代码如下：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[root@abc ~]# python</span></span>
<span class="line"><span>Python 2.7.5 (default, Nov  6 2016, 00:28:07)</span></span>
<span class="line"><span>[GCC 4.8.5 20150623 (Red Hat 4.8.5-11)] on linux2</span></span>
<span class="line"><span>Type &quot;help&quot;, &quot;copyright&quot;, &quot;credits&quot; or &quot;license&quot; for more information.</span></span>
<span class="line"><span>&gt;&gt;&gt; import crypt</span></span>
<span class="line"><span>&gt;&gt;&gt; crypt.crypt(&quot;abc&quot;, &quot;$6$DEgVEU0T&quot;)</span></span>
<span class="line"><span>&#39;$6$DEgVEU0T$mwlTGb/nTtvpIJcoIy2t9xNMgv0.IT34WLvQ7VmbWJP9rU8Ysp9JyJ8I8PxEleGPWoirdbk4VKbhtCg6P.sm1.&#39;</span></span></code></pre></div><h2 id="密码相关一些配置" tabindex="-1">密码相关一些配置 <a class="header-anchor" href="#密码相关一些配置" aria-label="Permalink to &quot;密码相关一些配置&quot;">​</a></h2><p>/etc/login.defs 用来存放一些与创建用户和密码相关的配置信息<br> 当使用useradd创建新用户时，系统会读取该文件，然后写入/etc/shadows.<br> 和密码相关的只要是 PASS_MAX_DAYS，PASS_MIN_DAYS，PASS_MIN_LEN，PASS_WARN_AGE，ENCRYPT_METHOD 这几个参数<br> UMASK用来定义默认的新建文件权限</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[root@linux /root]# grep ^[^#] /etc/login.defs</span></span>
<span class="line"><span>MAIL_DIR	/var/spool/mail</span></span>
<span class="line"><span>PASS_MAX_DAYS	99999</span></span>
<span class="line"><span>PASS_MIN_DAYS	0</span></span>
<span class="line"><span>PASS_MIN_LEN	5</span></span>
<span class="line"><span>PASS_WARN_AGE	7</span></span>
<span class="line"><span>UID_MIN                  1000</span></span>
<span class="line"><span>UID_MAX                 60000</span></span>
<span class="line"><span>SYS_UID_MIN               201</span></span>
<span class="line"><span>SYS_UID_MAX               999</span></span>
<span class="line"><span>GID_MIN                  1000</span></span>
<span class="line"><span>GID_MAX                 60000</span></span>
<span class="line"><span>SYS_GID_MIN               201</span></span>
<span class="line"><span>SYS_GID_MAX               999</span></span>
<span class="line"><span>CREATE_HOME	yes</span></span>
<span class="line"><span>UMASK           077</span></span>
<span class="line"><span>USERGROUPS_ENAB yes</span></span>
<span class="line"><span>ENCRYPT_METHOD SHA512</span></span></code></pre></div><blockquote><p>参考：<br> man 8 pwconv<br> man 5 shadow<br> man 3 crypt</p></blockquote>`,41),e=[t];function l(h,o,r,c,d,k){return n(),a("div",null,e)}const y=s(i,[["render",l]]);export{u as __pageData,y as default};
