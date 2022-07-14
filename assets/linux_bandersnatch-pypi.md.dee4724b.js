import{_ as s,c as a,o as n,a as p}from"./app.526dca4e.js";const A=JSON.parse('{"title":"\u4F7F\u7528Bandersnatch\u642D\u5EFA\u79C1\u6709Pypi\u6E90","description":"","frontmatter":{"title":"\u4F7F\u7528Bandersnatch\u642D\u5EFA\u79C1\u6709Pypi\u6E90"},"headers":[{"level":2,"title":"\u5B89\u88C5virtualenv","slug":"\u5B89\u88C5virtualenv"},{"level":3,"title":"\u521B\u5EFA\u72EC\u7ACBPython\u73AF\u5883","slug":"\u521B\u5EFA\u72EC\u7ACBpython\u73AF\u5883"},{"level":3,"title":"\u6FC0\u6D3B\u72EC\u7ACBPython\u73AF\u5883","slug":"\u6FC0\u6D3B\u72EC\u7ACBpython\u73AF\u5883"},{"level":3,"title":"\u5B89\u88C5Bandersnatch","slug":"\u5B89\u88C5bandersnatch"},{"level":3,"title":"\u83B7\u53D6\u5B89\u88C5\u5305","slug":"\u83B7\u53D6\u5B89\u88C5\u5305"},{"level":3,"title":"\u89E3\u538B\u7F29tar\u5305","slug":"\u89E3\u538B\u7F29tar\u5305"},{"level":3,"title":"\u4F7F\u7528pip\u5B89\u88C5","slug":"\u4F7F\u7528pip\u5B89\u88C5"},{"level":2,"title":"\u914D\u7F6EBandersnatch\u5E76\u8FD0\u884C","slug":"\u914D\u7F6Ebandersnatch\u5E76\u8FD0\u884C"},{"level":3,"title":"\u9996\u6B21\u8FD0\u884C\u521B\u5EFA\u914D\u7F6E\u6587\u4EF6","slug":"\u9996\u6B21\u8FD0\u884C\u521B\u5EFA\u914D\u7F6E\u6587\u4EF6"},{"level":3,"title":"\u4FEE\u6539\u914D\u7F6E\u6587\u4EF6","slug":"\u4FEE\u6539\u914D\u7F6E\u6587\u4EF6"},{"level":2,"title":"\u542F\u52A8\u540C\u6B65","slug":"\u542F\u52A8\u540C\u6B65"}],"relativePath":"linux/bandersnatch-pypi.md","lastUpdated":1657810449000}'),e={name:"linux/bandersnatch-pypi.md"},l=p(`<h1 id="\u4F7F\u7528bandersnatch\u642D\u5EFA\u79C1\u6709pypi\u6E90" tabindex="-1">\u4F7F\u7528Bandersnatch\u642D\u5EFA\u79C1\u6709Pypi\u6E90 <a class="header-anchor" href="#\u4F7F\u7528bandersnatch\u642D\u5EFA\u79C1\u6709pypi\u6E90" aria-hidden="true">#</a></h1><p>\u7ECF\u5E38\u4F7F\u7528python\u7684\u516C\u53F8,\u8003\u8651\u5230pypi.python.org\u4E0D\u7A33\u5B9A,\u90FD\u4F1A\u81EA\u5DF1\u642D\u5EFA\u79C1\u6709\u7684Pypi\u6E90.\u8FD9\u91CC\u7B80\u5355\u4ECB\u7ECD\u4E0B\u65B9\u6CD5.</p><p>\u73B0\u5728\u6D41\u884C\u4F7F\u7528Bandersnatch\u4F5C\u4E3A\u540C\u6B65\u5DE5\u5177, \u5982\u4E0B\u6F14\u793A\u5728centos7.4\u73AF\u5883\u4E0B\u901A\u8FC7</p><h2 id="\u5B89\u88C5virtualenv" tabindex="-1">\u5B89\u88C5virtualenv <a class="header-anchor" href="#\u5B89\u88C5virtualenv" aria-hidden="true">#</a></h2><p>virtualenv \u53EF\u4EE5\u4E3A\u4E00\u4E2A\u5E94\u7528\u521B\u5EFA\u4E00\u5957\u201C\u9694\u79BB\u201D\u7684Python\u8FD0\u884C\u73AF\u5883\u3002\u6240\u6709\u4F9D\u8D56\u5305\u5728\u81EA\u5DF1\u72EC\u7ACB\u7684\u73AF\u5883,\u4E0D\u4F1A\u5F71\u54CD\u5176\u4ED6python\u7A0B\u5E8F,\u66F4\u4E0D\u4F1A\u653E\u5230\u7CFB\u7EDF\u9ED8\u8BA4\u7684site-packages\u91CC</p><div class="language-bash"><span class="copy"></span><pre><code><span class="line"><span style="color:#A6ACCD;">$ yum install python-virtualenv</span></span>
<span class="line"></span></code></pre></div><h3 id="\u521B\u5EFA\u72EC\u7ACBpython\u73AF\u5883" tabindex="-1">\u521B\u5EFA\u72EC\u7ACBPython\u73AF\u5883 <a class="header-anchor" href="#\u521B\u5EFA\u72EC\u7ACBpython\u73AF\u5883" aria-hidden="true">#</a></h3><div class="language-bash"><span class="copy"></span><pre><code><span class="line"><span style="color:#A6ACCD;">$ virtualenv Bandersnatch</span></span>
<span class="line"><span style="color:#A6ACCD;">New python executable </span><span style="color:#89DDFF;font-style:italic;">in</span><span style="color:#A6ACCD;"> Bandersnatch/bin/python</span></span>
<span class="line"><span style="color:#A6ACCD;">Please make sure you remove any previous custom paths from your /root/.pydistutils.cfg file.</span></span>
<span class="line"><span style="color:#A6ACCD;">Installing Setuptools...........................................................done.</span></span>
<span class="line"><span style="color:#A6ACCD;">Installing Pip..................................................................done.</span></span>
<span class="line"><span style="color:#A6ACCD;">$</span></span>
<span class="line"></span></code></pre></div><h3 id="\u6FC0\u6D3B\u72EC\u7ACBpython\u73AF\u5883" tabindex="-1">\u6FC0\u6D3B\u72EC\u7ACBPython\u73AF\u5883 <a class="header-anchor" href="#\u6FC0\u6D3B\u72EC\u7ACBpython\u73AF\u5883" aria-hidden="true">#</a></h3><div class="language-bash"><span class="copy"></span><pre><code><span class="line"><span style="color:#89DDFF;">[</span><span style="color:#A6ACCD;">root@abc </span><span style="color:#89DDFF;">~]</span><span style="color:#A6ACCD;">$ </span><span style="color:#82AAFF;">source</span><span style="color:#A6ACCD;"> Bandersnatch/bin/activate</span></span>
<span class="line"><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">Bandersnatch</span><span style="color:#89DDFF;">)[</span><span style="color:#A6ACCD;">root@abc </span><span style="color:#89DDFF;">~]</span><span style="color:#676E95;font-style:italic;">#</span></span>
<span class="line"></span></code></pre></div><p>\u5F53\u6307\u793A\u7B26\u524D\u663E\u793A <code>(Bandersnatch)</code> \u5B57\u6837, \u610F\u5473\u7740\u6240\u6709python\u7684\u64CD\u4F5C,\u90FD\u53EA\u9650\u4E8E\u72EC\u7ACB\u73AF\u5883, \u7CFB\u7EDFPython\u73AF\u5883\u4E0D\u53D7\u4EFB\u4F55\u5F71\u54CD</p><h3 id="\u5B89\u88C5bandersnatch" tabindex="-1">\u5B89\u88C5Bandersnatch <a class="header-anchor" href="#\u5B89\u88C5bandersnatch" aria-hidden="true">#</a></h3><p>\u6700\u65B0\u7248\u7684<code>Bandersnatch 2.0</code>\u652F\u6301python3, \u4F46\u76EE\u524D\u7684\u73AF\u5883\u662Fpython2.7.5, \u6240\u4EE5\u9700\u8981\u4E0B\u8F7D\u5176\u4ED6\u7248\u672C. \u8FD9\u91CC\u53D6<code>1.11</code>\u7248</p><h3 id="\u83B7\u53D6\u5B89\u88C5\u5305" tabindex="-1">\u83B7\u53D6\u5B89\u88C5\u5305 <a class="header-anchor" href="#\u83B7\u53D6\u5B89\u88C5\u5305" aria-hidden="true">#</a></h3><div class="language-bash"><span class="copy"></span><pre><code><span class="line"><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">Bandersnatch</span><span style="color:#89DDFF;">)[</span><span style="color:#A6ACCD;">root@abc </span><span style="color:#89DDFF;">~]</span><span style="color:#A6ACCD;">$ wget https://bitbucket.org/pypa/bandersnatch/get/1.11.tar.gz</span></span>
<span class="line"><span style="color:#A6ACCD;">--2018-01-02 22:39:22--  https://bitbucket.org/pypa/bandersnatch/get/1.11.tar.gz</span></span>
<span class="line"><span style="color:#A6ACCD;">Resolving bitbucket.org </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">bitbucket.org</span><span style="color:#89DDFF;">)</span><span style="color:#A6ACCD;">... 104.192.143.3, 104.192.143.2, 104.192.143.1, ...</span></span>
<span class="line"><span style="color:#A6ACCD;">Connecting to bitbucket.org </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">bitbucket.org</span><span style="color:#89DDFF;">)|</span><span style="color:#A6ACCD;">104.192.143.3</span><span style="color:#89DDFF;">|</span><span style="color:#A6ACCD;">:443... connected.</span></span>
<span class="line"><span style="color:#A6ACCD;">HTTP request sent, awaiting response... 200 OK</span></span>
<span class="line"><span style="color:#A6ACCD;">Length: 25988 </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">25K</span><span style="color:#89DDFF;">)</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">[</span><span style="color:#A6ACCD;">application/x-tar-gz</span><span style="color:#89DDFF;">]</span></span>
<span class="line"><span style="color:#A6ACCD;">Saving to: \u20181.11.tar.gz.1\u2019</span></span>
<span class="line"></span>
<span class="line"><span style="color:#A6ACCD;">100%</span><span style="color:#89DDFF;">[=============================================&gt;]</span><span style="color:#A6ACCD;"> 25,988      72.9KB/s   </span><span style="color:#89DDFF;font-style:italic;">in</span><span style="color:#A6ACCD;"> 0.3s</span></span>
<span class="line"></span>
<span class="line"><span style="color:#A6ACCD;">2018-01-02 22:39:24 </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">72.9 KB/s</span><span style="color:#89DDFF;">)</span><span style="color:#A6ACCD;"> - \u20181.11.tar.gz.1\u2019 saved </span><span style="color:#89DDFF;">[</span><span style="color:#A6ACCD;">25988/25988</span><span style="color:#89DDFF;">]</span></span>
<span class="line"></span></code></pre></div><h3 id="\u89E3\u538B\u7F29tar\u5305" tabindex="-1">\u89E3\u538B\u7F29tar\u5305 <a class="header-anchor" href="#\u89E3\u538B\u7F29tar\u5305" aria-hidden="true">#</a></h3><div class="language-bash"><span class="copy"></span><pre><code><span class="line"><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">Bandersnatch</span><span style="color:#89DDFF;">)[</span><span style="color:#A6ACCD;">root@abc </span><span style="color:#89DDFF;">~]</span><span style="color:#A6ACCD;">$ tar -xzvf 1.11.tar.gz</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/.hg_archival.txt</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/.coveragerc</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/.hgignore</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/.hgtags</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/CHANGES.txt</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/DEVELOPMENT</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/LICENSE</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/MANIFEST.in</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/README</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/buildout.cfg</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/pytest.ini</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/requirements.txt</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/setup.py</span></span>
<span class="line"><span style="color:#A6ACCD;">pypa-bandersnatch-76b72f3ebd6c/src/bandersnatch/__init__.py</span></span>
<span class="line"><span style="color:#89DDFF;">\`\`\`\`\`\`\`\`\`\`\`\`\`\`\`\`\`\`\`\`\`\`\`\`\`(</span><span style="color:#C3E88D;">\u6B64\u5904\u7701\u7565\u82E5\u5E72\u5B57</span><span style="color:#89DDFF;">)</span></span>
<span class="line"></span></code></pre></div><h3 id="\u4F7F\u7528pip\u5B89\u88C5" tabindex="-1">\u4F7F\u7528pip\u5B89\u88C5 <a class="header-anchor" href="#\u4F7F\u7528pip\u5B89\u88C5" aria-hidden="true">#</a></h3><div class="language-bash"><span class="copy"></span><pre><code><span class="line"><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">Bandersnatch</span><span style="color:#89DDFF;">)[</span><span style="color:#A6ACCD;">root@abc </span><span style="color:#89DDFF;">~]</span><span style="color:#A6ACCD;">$ pip install -r pypa-bandersnatch-76b72f3ebd6c/requirements.txt</span></span>
<span class="line"><span style="color:#A6ACCD;">Downloading/unpacking coverage==3.7.1 </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">from -r pypa-bandersnatch-76b72f3ebd6c/requirements.txt </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">line 2</span><span style="color:#89DDFF;">))</span></span>
<span class="line"><span style="color:#A6ACCD;">  Downloading coverage-3.7.1.tar.gz </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">284kB</span><span style="color:#89DDFF;">)</span><span style="color:#A6ACCD;">: 284kB downloaded</span></span>
<span class="line"><span style="color:#A6ACCD;">  Running setup.py egg_info </span><span style="color:#89DDFF;font-style:italic;">for</span><span style="color:#A6ACCD;"> package coverage</span></span>
<span class="line"></span>
<span class="line"><span style="color:#A6ACCD;">    warning: no previously-included files matching </span><span style="color:#89DDFF;">&#39;</span><span style="color:#C3E88D;">*.pyc</span><span style="color:#89DDFF;">&#39;</span><span style="color:#A6ACCD;"> found anywhere </span><span style="color:#89DDFF;font-style:italic;">in</span><span style="color:#A6ACCD;"> distribution</span></span>
<span class="line"><span style="color:#A6ACCD;">Downloading/unpacking pyparsing==2.1.3 </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">from -r pypa-bandersnatch-76b72f3ebd6c/requirements.txt </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">line 3</span><span style="color:#89DDFF;">))</span></span>
<span class="line"><span style="color:#A6ACCD;">  Downloading pyparsing-2.1.3.tar.gz </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">1.1MB</span><span style="color:#89DDFF;">)</span><span style="color:#A6ACCD;">: 1.1MB downloaded</span></span>
<span class="line"><span style="color:#A6ACCD;">  Running setup.py egg_info </span><span style="color:#89DDFF;font-style:italic;">for</span><span style="color:#A6ACCD;"> package pyparsing</span></span>
<span class="line"></span>
<span class="line"><span style="color:#A6ACCD;">Downloading/unpacking py==1.4.26 </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">from -r pypa-bandersnatch-76b72f3ebd6c/requirements.txt </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">line 4</span><span style="color:#89DDFF;">))</span></span>
<span class="line"><span style="color:#A6ACCD;">  Downloading py-1.4.26.tar.gz </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">190kB</span><span style="color:#89DDFF;">)</span><span style="color:#A6ACCD;">: 190kB downloaded</span></span>
<span class="line"><span style="color:#A6ACCD;">  Running setup.py egg_info </span><span style="color:#89DDFF;font-style:italic;">for</span><span style="color:#A6ACCD;"> package py</span></span>
<span class="line"><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">\u6B64\u5904\u7701\u7565\u82E5\u5E72\u5B57</span><span style="color:#89DDFF;">)</span></span>
<span class="line"><span style="color:#A6ACCD;">      Installing bandersnatch script to /root/Bandersnatch/bin</span></span>
<span class="line"><span style="color:#A6ACCD;">  Could not find .egg-info directory </span><span style="color:#89DDFF;font-style:italic;">in</span><span style="color:#A6ACCD;"> install record </span><span style="color:#89DDFF;font-style:italic;">for</span><span style="color:#A6ACCD;"> bandersnatch==1.11 </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">from -r pypa-bandersnatch-76b72f3ebd6c/requirements.txt </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">line 22</span><span style="color:#89DDFF;">))</span></span>
<span class="line"><span style="color:#A6ACCD;">Successfully installed coverage pyparsing py pyflakes pep8 pytest cov-core execnet python-dateutil six setuptools mock packaging pytest-capturelog pytest-codecheckers pytest-cov pytest-timeout pytest-cache requests xmlrpc2 bandersnatch</span></span>
<span class="line"><span style="color:#A6ACCD;">Cleaning up...</span></span>
<span class="line"><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">Bandersnatch</span><span style="color:#89DDFF;">)[</span><span style="color:#A6ACCD;">root@abc </span><span style="color:#89DDFF;">~]</span><span style="color:#A6ACCD;">$</span></span>
<span class="line"></span></code></pre></div><h2 id="\u914D\u7F6Ebandersnatch\u5E76\u8FD0\u884C" tabindex="-1">\u914D\u7F6EBandersnatch\u5E76\u8FD0\u884C <a class="header-anchor" href="#\u914D\u7F6Ebandersnatch\u5E76\u8FD0\u884C" aria-hidden="true">#</a></h2><h3 id="\u9996\u6B21\u8FD0\u884C\u521B\u5EFA\u914D\u7F6E\u6587\u4EF6" tabindex="-1">\u9996\u6B21\u8FD0\u884C\u521B\u5EFA\u914D\u7F6E\u6587\u4EF6 <a class="header-anchor" href="#\u9996\u6B21\u8FD0\u884C\u521B\u5EFA\u914D\u7F6E\u6587\u4EF6" aria-hidden="true">#</a></h3><div class="language-"><span class="copy"></span><pre><code><span class="line"><span style="color:#A6ACCD;">(Bandersnatch)[root@abc ~]$ bandersnatch mirror</span></span>
<span class="line"><span style="color:#A6ACCD;">2018-01-02 22:43:37,985 WARNING: Config file &#39;/etc/bandersnatch.conf&#39; missing, creating default config.</span></span>
<span class="line"><span style="color:#A6ACCD;">2018-01-02 22:43:37,985 WARNING: Please review the config file, then run &#39;bandersnatch&#39; again.</span></span>
<span class="line"><span style="color:#A6ACCD;">(Bandersnatch)[root@abc ~]$</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span></code></pre></div><p>\u8FD9\u4E00\u6B65,\u4F1A\u521B\u5EFA\u9ED8\u8BA4\u7684\u914D\u7F6E\u6587\u4EF6/etc/bandersnatch.conf.</p><h3 id="\u4FEE\u6539\u914D\u7F6E\u6587\u4EF6" tabindex="-1">\u4FEE\u6539\u914D\u7F6E\u6587\u4EF6 <a class="header-anchor" href="#\u4FEE\u6539\u914D\u7F6E\u6587\u4EF6" aria-hidden="true">#</a></h3><p><code>vi /etc/bandersnatch.conf</code><br> \u4FEE\u6539directory\u4E3A\u5B58\u653E\u6587\u4EF6\u7684\u76EE\u6807\u6587\u4EF6\u5939. \u5176\u4ED6\u9009\u9879\u901A\u5E38\u4E0D\u9700\u8981\u4FEE\u6539.</p><div class="language-ini"><span class="copy"></span><pre><code><span class="line"><span style="color:#89DDFF;">[mirror]</span></span>
<span class="line"><span style="color:#676E95;font-style:italic;">; The directory where the mirror data will be stored.</span></span>
<span class="line"><span style="color:#F07178;">directory</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">=</span><span style="color:#A6ACCD;"> /srv/pypi</span></span>
<span class="line"></span></code></pre></div><h2 id="\u542F\u52A8\u540C\u6B65" tabindex="-1">\u542F\u52A8\u540C\u6B65 <a class="header-anchor" href="#\u542F\u52A8\u540C\u6B65" aria-hidden="true">#</a></h2><div class="language-bash"><span class="copy"></span><pre><code><span class="line"><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">Bandersnatch</span><span style="color:#89DDFF;">)[</span><span style="color:#A6ACCD;">root@abc </span><span style="color:#89DDFF;">~]</span><span style="color:#A6ACCD;">$ bandersnatch  mirror</span></span>
<span class="line"><span style="color:#A6ACCD;">2018-01-02 22:45:44,376 INFO: bandersnatch/1.11 </span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">CPython 2.7.5-final0, Linux 3.10.0-693.2.2.el7.x86_64 x86_64</span><span style="color:#89DDFF;">)</span></span>
<span class="line"><span style="color:#A6ACCD;">2018-01-02 22:45:44,376 INFO: Status file missing. Starting over.</span></span>
<span class="line"><span style="color:#A6ACCD;">2018-01-02 22:45:44,376 INFO: Syncing with https://pypi.python.org.</span></span>
<span class="line"><span style="color:#A6ACCD;">2018-01-02 22:45:44,376 INFO: Current mirror serial: 0</span></span>
<span class="line"><span style="color:#A6ACCD;">2018-01-02 22:45:44,376 INFO: Syncing all packages.</span></span>
<span class="line"><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;">\u6B64\u5904\u7701\u7565\u82E5\u5E72\u5B57</span><span style="color:#89DDFF;">)</span></span>
<span class="line"></span></code></pre></div><h1 id="\u5176\u4ED6\u8BF4\u660E" tabindex="-1">\u5176\u4ED6\u8BF4\u660E <a class="header-anchor" href="#\u5176\u4ED6\u8BF4\u660E" aria-hidden="true">#</a></h1><p>\u56E0\u4E3A\u4F7F\u7528\u4E86<code>virtualenv</code>, \u5C06\u7A0B\u5E8F\u79FB\u690D\u4E5F\u5F88\u65B9\u4FBF, \u4F7F\u7528<code>tar -czvf Bandersnatch.tar.gz Bandersnatch </code>\u5C06\u6587\u4EF6\u5939\u6253\u5305,\u5728\u5176\u4ED6\u4E3B\u673A(\u9700\u8981\u6709python2)\u7684\u76F8\u540C\u76EE\u5F55\u4E0B\u89E3\u5305\u5373\u53EF\u76F4\u63A5\u8FD0\u884C</p><p>\u5982\u679C\u8981\u7CFB\u7EDF\u5B9A\u671F\u81EA\u52A8\u540C\u6B65, \u5219\u521B\u5EFA<code>/etc/cron.d/bandersnatch</code>\u6587\u4EF6, \u5C06\u4E0B\u9762\u5185\u5BB9\u5199\u5165</p><div class="language-bash"><span class="copy"></span><pre><code><span class="line"><span style="color:#89DDFF;">*</span><span style="color:#A6ACCD;">/2 </span><span style="color:#89DDFF;">*</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">*</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">*</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">*</span><span style="color:#A6ACCD;"> root bandersnatch mirror </span><span style="color:#89DDFF;">|&amp;</span><span style="color:#A6ACCD;"> logger -t bandersnatch</span><span style="color:#89DDFF;">[</span><span style="color:#A6ACCD;">mirror</span><span style="color:#89DDFF;">]</span></span>
<span class="line"></span></code></pre></div><p>\u8BE5\u5B9A\u65F6\u4EFB\u52A1\u4F1A\u5C06\u8FD0\u884C\u65E5\u5FD7\u5199\u5165\u5230\u7CFB\u7EDF\u65E5\u5FD7\u91CC. <code>|&amp;</code> \u4EE3\u8868 \u524D\u8005\u7684\u6807\u51C6\u8F93\u51FA\u548C\u6807\u51C6\u9519\u8BEF\u90FD\u4F5C\u4E3A\u540E\u8005\u7684\u6807\u51C6\u8F93\u5165</p><p>\u672C\u6587\u4E3B\u8981\u53C2\u8003\u4E86 <a href="https://pypi.python.org/pypi/bandersnatch" target="_blank" rel="noopener noreferrer">https://pypi.python.org/pypi/bandersnatch</a></p>`,34),o=[l];function t(c,r,i,y,D,d){return n(),a("div",null,o)}var h=s(e,[["render",t]]);export{A as __pageData,h as default};
