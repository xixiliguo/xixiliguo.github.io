import { defineUserConfig } from 'vuepress'
import type { DefaultThemeOptions } from 'vuepress'

export default defineUserConfig<DefaultThemeOptions>({
  lang: 'en-US',
  title: 'xixiliguo',
  description: 'stay hungry stay foolish',
  head: [
    [
      'link',
      {
        rel: 'icon',
        type: 'image/jpg',
        href: `/img/coast.jpg`,
      },
    ]
  ],
  markdown: {
    code: {
      lineNumbers: false
    }
  },
  themeConfig: {
    tip: '提示',
    warning: '注意',
    danger: '警告',
    navbar: [ 
      { text: 'Linux运维', link: '/linux/atop.md' },
      { text: '网络协议', link: '/network/tcpdump-wireshark.md' },
      { text: 'Golang笔记', link: '/golang/golang-exec.md' },
      { text: '容器与k8s', link: '/k8s/runc.md' },
      { text: '算法笔记', link: '/algorithm/radix-tree.md' },
      { text: '内核分析', link: '/kernel/linux-trap.md' },
      { text: '杂项', link: '/others/lua-implemention-gc.md' }
    ],
    sidebar: {
      '/linux/': [
        {
          text: 'Linux运维',
          children: [
            '/linux/atop.md',
            '/linux/cloud-init.md',
            '/linux/linux-shadow.md',
            '/linux/bandersnatch-pypi.md',
            '/linux/ntp.md',
            '/linux/dns.md',
            '/linux/multi-queue.md',
            '/linux/linux-boot.md',
            '/linux/yum-update.md',
            '/linux/linux-common-commands.md'
          ],
        },        
      ],
      '/network/': [
        {
          text: '网络协议',
          children: [
            '/network/tcpdump-wireshark.md',
            '/network/tcp.md',
            '/network/libvirt-network.md',
          ],
        },        
      ],
      '/golang/': [
        {
          text: 'Golang笔记',
          children: [
            '/golang/golang-exec.md',
            '/golang/strings-algorithm-golang.md',
          ],
        },        
      ],
      '/k8s/': [
        {
          text: '容器与k8s',
          children: [
            '/k8s/runc.md',
          ],
        },        
      ],
      '/algorithm/': [
        {
          text: '算法笔记',
          children: [
            '/algorithm/radix-tree.md',
            '/algorithm/algorithm-dfs.md',
            '/algorithm/binary-index-tree.md',
            '/algorithm/segment-tree.md',
            '/algorithm/unionfind.md',
          ],
        },        
      ],
      '/kernel/': [
        {
          text: '内核分析',
          children: [
            '/kernel/kernel-syscall-sched.md',
            '/kernel/kernel-memory.md',
            '/kernel/linux-trap.md',
          ],
        },        
      ],
      '/others/': [
        {
          text: '杂项',
          children: [
            '/others/lua-implemention-gc.md',
            '/others/lua-implemention-type-value.md',
            '/others/code_segment.md',
          ],
        },        
      ],
    },
  },
  plugins: [
    [
      '@vuepress/plugin-docsearch',
      {
        apiKey: 'XXXXXXXXXXXXXXXXXXX',
        indexName: 'vuepress',
        searchParameters: {
          facetFilters: ['tags:v2'],
        },
      },
    ],
    [
      '@vuepress/plugin-google-analytics',
      {
        id: 'G-XXXXXXXXXX',
      },
    ],
  ],
})