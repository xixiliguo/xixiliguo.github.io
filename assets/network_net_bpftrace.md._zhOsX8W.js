import{_ as s,c as n,o as a,a2 as p}from"./chunks/framework.KQnwS2KS.js";const f=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"network/net_bpftrace.md","filePath":"network/net_bpftrace.md","lastUpdated":1754323216000}'),t={name:"network/net_bpftrace.md"},e=p(`<h2 id="跟踪-tracepoint-kfree-skb" tabindex="-1">跟踪 tracepoint kfree_skb <a class="header-anchor" href="#跟踪-tracepoint-kfree-skb" aria-label="Permalink to &quot;跟踪 tracepoint kfree_skb&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>#!/usr/bin/bpftrace</span></span>
<span class="line"><span></span></span>
<span class="line"><span>tracepoint:skb:kfree_skb {</span></span>
<span class="line"><span>    $skb = (struct sk_buff *)args-&gt;skbaddr;</span></span>
<span class="line"><span>    $iph = (struct iphdr *)($skb-&gt;head + $skb-&gt;network_header);</span></span>
<span class="line"><span>    if ($iph-&gt;protocol == IPPROTO_ICMP) {</span></span>
<span class="line"><span>        $icmph = (struct icmphdr *)($skb-&gt;head + $skb-&gt;transport_header);</span></span>
<span class="line"><span>        printf(&quot;TIME:%s PID/TID: %d/%d &quot;, strftime(&quot;%H:%M:%S:%f&quot;, nsecs), pid, tid);</span></span>
<span class="line"><span>        printf(&quot;COMM: %s DEV: %s\\n&quot;, comm, $skb-&gt;dev-&gt;name);</span></span>
<span class="line"><span>        printf(&quot;ICMP %s-&gt;%s &quot;, ntop($iph-&gt;saddr), ntop($iph-&gt;daddr));</span></span>
<span class="line"><span>        printf(&quot;id:%d seq:%d &quot;, bswap($icmph-&gt;un.echo.id), bswap($icmph-&gt;un.echo.sequence));</span></span>
<span class="line"><span>        printf(&quot;\\n\\n&quot;);</span></span>
<span class="line"><span>        // printf(&quot;%s&quot;, kstack);</span></span>
<span class="line"><span>    } else if ($iph-&gt;protocol == IPPROTO_TCP) {</span></span>
<span class="line"><span>        $tcph = (struct tcphdr *)($skb-&gt;head + $skb-&gt;transport_header);</span></span>
<span class="line"><span>        printf(&quot;TIME:%s PID/TID: %d/%d &quot;, strftime(&quot;%H:%M:%S:%f&quot;, nsecs), pid, tid);</span></span>
<span class="line"><span>        printf(&quot;COMM: %s DEV: %s \\n&quot;, comm, $skb-&gt;dev-&gt;name);</span></span>
<span class="line"><span>        printf(&quot;TCP %s:%d&quot;, ntop($iph-&gt;saddr), bswap($tcph-&gt;source));</span></span>
<span class="line"><span>        printf(&quot; -&gt; %s:%d &quot;, ntop($iph-&gt;daddr), bswap($tcph-&gt;dest));</span></span>
<span class="line"><span>        printf(&quot;FLAGS: [&quot;);</span></span>
<span class="line"><span>        if ($tcph-&gt;syn) {</span></span>
<span class="line"><span>            printf(&quot;S&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if ($tcph-&gt;fin) {</span></span>
<span class="line"><span>            printf(&quot;F&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if ($tcph-&gt;rst) {</span></span>
<span class="line"><span>            printf(&quot;R&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if ($tcph-&gt;psh) {</span></span>
<span class="line"><span>            printf(&quot;P&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if ($tcph-&gt;ack) {</span></span>
<span class="line"><span>            printf(&quot;.&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        printf(&quot;] &quot;);</span></span>
<span class="line"><span>        $seq = bswap($tcph-&gt;seq);</span></span>
<span class="line"><span>        $ack = bswap($tcph-&gt;ack_seq);</span></span>
<span class="line"><span>        printf(&quot;SEQ: %ld ACK: %ld &quot;, $seq, $ack);</span></span>
<span class="line"><span>        printf(&quot;\\n\\n&quot;);</span></span>
<span class="line"><span>        // printf(&quot;%s&quot;, kstack);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="跟踪-tcp-reset" tabindex="-1">跟踪 tcp reset <a class="header-anchor" href="#跟踪-tcp-reset" aria-label="Permalink to &quot;跟踪 tcp reset&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>#!/usr/bin/bpftrace</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#define AF_INET   2</span></span>
<span class="line"><span>#define AF_INET6 10</span></span>
<span class="line"><span></span></span>
<span class="line"><span>kprobe:tcp_v4_send_reset {</span></span>
<span class="line"><span>    $sk = (struct sock *)arg0;</span></span>
<span class="line"><span>    $skb = (struct sk_buff *)arg1;</span></span>
<span class="line"><span>    $iph = (struct iphdr *)($skb-&gt;head + $skb-&gt;network_header);</span></span>
<span class="line"><span>    // printf(&quot;%p %p %d\\n&quot;, $skb, $skb-&gt;head, $skb-&gt;network_header);</span></span>
<span class="line"><span>    if ($iph-&gt;protocol == IPPROTO_TCP) {</span></span>
<span class="line"><span>        $tcph = (struct tcphdr *)($skb-&gt;head + $skb-&gt;transport_header);</span></span>
<span class="line"><span>        printf(&quot;PASSIVE RESET TIME:%s PID/TID: %d/%d &quot;, strftime(&quot;%H:%M:%S:%f&quot;, nsecs), pid, tid);</span></span>
<span class="line"><span>        printf(&quot;COMM: %s DEV: %s \\n&quot;, comm, $skb-&gt;dev-&gt;name);</span></span>
<span class="line"><span>        printf(&quot;TCP %s:%d&quot;, ntop($iph-&gt;saddr), bswap($tcph-&gt;source));</span></span>
<span class="line"><span>        printf(&quot; -&gt; %s:%d &quot;, ntop($iph-&gt;daddr), bswap($tcph-&gt;dest));</span></span>
<span class="line"><span>        printf(&quot;FLAGS: [&quot;);</span></span>
<span class="line"><span>        if ($tcph-&gt;syn) {</span></span>
<span class="line"><span>            printf(&quot;S&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if ($tcph-&gt;fin) {</span></span>
<span class="line"><span>            printf(&quot;F&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if ($tcph-&gt;rst) {</span></span>
<span class="line"><span>            printf(&quot;R&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if ($tcph-&gt;psh) {</span></span>
<span class="line"><span>            printf(&quot;P&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if ($tcph-&gt;ack) {</span></span>
<span class="line"><span>            printf(&quot;.&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        printf(&quot;] &quot;);</span></span>
<span class="line"><span>        $seq = bswap($tcph-&gt;seq);</span></span>
<span class="line"><span>        $ack = bswap($tcph-&gt;ack_seq);</span></span>
<span class="line"><span>        printf(&quot;SEQ: %ld ACK: %ld &quot;, $seq, $ack);</span></span>
<span class="line"><span>        printf(&quot;\\n\\n&quot;);</span></span>
<span class="line"><span>        // printf(&quot;%s&quot;, kstack);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>kprobe:tcp_send_active_reset {</span></span>
<span class="line"><span>    $sk = (struct sock *)arg0;</span></span>
<span class="line"><span>    $lport = $sk-&gt;__sk_common.skc_num;</span></span>
<span class="line"><span>    printf(&quot;%d %d\\n&quot;, $lport, $sk-&gt;__sk_common.skc_num);</span></span>
<span class="line"><span>	$dport = $sk-&gt;__sk_common.skc_dport;</span></span>
<span class="line"><span>	$dport = bswap($dport);</span></span>
<span class="line"><span>    $family = $sk-&gt;__sk_common.skc_family;</span></span>
<span class="line"><span>    $saddr = ntop(0);</span></span>
<span class="line"><span>    $daddr = ntop(0);</span></span>
<span class="line"><span>    if ($family == AF_INET) {</span></span>
<span class="line"><span>        $saddr = ntop(AF_INET, $sk-&gt;__sk_common.skc_rcv_saddr);</span></span>
<span class="line"><span>        $daddr = ntop(AF_INET, $sk-&gt;__sk_common.skc_daddr);</span></span>
<span class="line"><span>    } else {</span></span>
<span class="line"><span>        // AF_INET6</span></span>
<span class="line"><span>        $saddr = ntop(AF_INET6,</span></span>
<span class="line"><span>            $sk-&gt;__sk_common.skc_v6_rcv_saddr.in6_u.u6_addr8);</span></span>
<span class="line"><span>        $daddr = ntop(AF_INET6,</span></span>
<span class="line"><span>            $sk-&gt;__sk_common.skc_v6_daddr.in6_u.u6_addr8);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    printf(&quot;ACTIVE RESET TIME:%s PID/TID: %d/%d &quot;, strftime(&quot;%H:%M:%S:%f&quot;, nsecs), pid, tid);</span></span>
<span class="line"><span>    printf(&quot;%s:%d -&gt; %s:%d&quot;, $saddr, $lport, $daddr, $dport);</span></span>
<span class="line"><span>    printf(&quot;\\n\\n&quot;);</span></span>
<span class="line"><span>    printf(&quot;%s&quot;, kstack);</span></span>
<span class="line"><span>}</span></span></code></pre></div>`,4),l=[e];function i(c,o,r,d,u,q){return a(),n("div",null,l)}const k=s(t,[["render",i]]);export{f as __pageData,k as default};
