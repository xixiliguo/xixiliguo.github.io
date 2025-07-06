
## 跟踪 tracepoint kfree_skb
```
#!/usr/bin/bpftrace

tracepoint:skb:kfree_skb {
    $skb = (struct sk_buff *)args->skbaddr;
    $iph = (struct iphdr *)($skb->head + $skb->network_header);
    if ($iph->protocol == IPPROTO_ICMP) {
        $icmph = (struct icmphdr *)($skb->head + $skb->transport_header);
        printf("TIME:%s PID/TID: %d/%d ", strftime("%H:%M:%S:%f", nsecs), pid, tid);
        printf("COMM: %s DEV: %s\n", comm, $skb->dev->name);
        printf("ICMP %s->%s ", ntop($iph->saddr), ntop($iph->daddr));
        printf("id:%d seq:%d ", bswap($icmph->un.echo.id), bswap($icmph->un.echo.sequence));
        printf("\n\n");
        // printf("%s", kstack);
    } else if ($iph->protocol == IPPROTO_TCP) {
        $tcph = (struct tcphdr *)($skb->head + $skb->transport_header);
        printf("TIME:%s PID/TID: %d/%d ", strftime("%H:%M:%S:%f", nsecs), pid, tid);
        printf("COMM: %s DEV: %s \n", comm, $skb->dev->name);
        printf("TCP %s:%d", ntop($iph->saddr), bswap($tcph->source));
        printf(" -> %s:%d ", ntop($iph->daddr), bswap($tcph->dest));
        printf("FLAGS: [");
        if ($tcph->syn) {
            printf("S");
        }
        if ($tcph->fin) {
            printf("F");
        }
        if ($tcph->rst) {
            printf("R");
        }
        if ($tcph->psh) {
            printf("P");
        }
        if ($tcph->ack) {
            printf(".");
        }
        printf("] ");
        $seq = bswap($tcph->seq);
        $ack = bswap($tcph->ack_seq);
        printf("SEQ: %ld ACK: %ld ", $seq, $ack);
        printf("\n\n");
        // printf("%s", kstack);
    }
}
``` 

## 跟踪 tcp reset

``` 
#!/usr/bin/bpftrace

#define AF_INET   2
#define AF_INET6 10

kprobe:tcp_v4_send_reset {
    $sk = (struct sock *)arg0;
    $skb = (struct sk_buff *)arg1;
    $iph = (struct iphdr *)($skb->head + $skb->network_header);
    // printf("%p %p %d\n", $skb, $skb->head, $skb->network_header);
    if ($iph->protocol == IPPROTO_TCP) {
        $tcph = (struct tcphdr *)($skb->head + $skb->transport_header);
        printf("PASSIVE RESET TIME:%s PID/TID: %d/%d ", strftime("%H:%M:%S:%f", nsecs), pid, tid);
        printf("COMM: %s DEV: %s \n", comm, $skb->dev->name);
        printf("TCP %s:%d", ntop($iph->saddr), bswap($tcph->source));
        printf(" -> %s:%d ", ntop($iph->daddr), bswap($tcph->dest));
        printf("FLAGS: [");
        if ($tcph->syn) {
            printf("S");
        }
        if ($tcph->fin) {
            printf("F");
        }
        if ($tcph->rst) {
            printf("R");
        }
        if ($tcph->psh) {
            printf("P");
        }
        if ($tcph->ack) {
            printf(".");
        }
        printf("] ");
        $seq = bswap($tcph->seq);
        $ack = bswap($tcph->ack_seq);
        printf("SEQ: %ld ACK: %ld ", $seq, $ack);
        printf("\n\n");
        // printf("%s", kstack);
    }
}

kprobe:tcp_send_active_reset {
    $sk = (struct sock *)arg0;
    $lport = $sk->__sk_common.skc_num;
    printf("%d %d\n", $lport, $sk->__sk_common.skc_num);
	$dport = $sk->__sk_common.skc_dport;
	$dport = bswap($dport);
    $family = $sk->__sk_common.skc_family;
    $saddr = ntop(0);
    $daddr = ntop(0);
    if ($family == AF_INET) {
        $saddr = ntop(AF_INET, $sk->__sk_common.skc_rcv_saddr);
        $daddr = ntop(AF_INET, $sk->__sk_common.skc_daddr);
    } else {
        // AF_INET6
        $saddr = ntop(AF_INET6,
            $sk->__sk_common.skc_v6_rcv_saddr.in6_u.u6_addr8);
        $daddr = ntop(AF_INET6,
            $sk->__sk_common.skc_v6_daddr.in6_u.u6_addr8);
    }
    printf("ACTIVE RESET TIME:%s PID/TID: %d/%d ", strftime("%H:%M:%S:%f", nsecs), pid, tid);
    printf("%s:%d -> %s:%d", $saddr, $lport, $daddr, $dport);
    printf("\n\n");
    printf("%s", kstack);
}
```