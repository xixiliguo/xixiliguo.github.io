

## MBR
`MBR` 是一种分区方式，占用第一个扇区，也就是前512个字节。前440字节分区不使用，预留给引导程序写入，比如grub。
紧接着6byte为磁盘标识，后面64 bytes代表四个分区信息。 最后2个字节固定是`0x55aa`代表是mbr分区。   
最大4个主分区，分区最大支持2T。                                   
```                                                                                              
+--------------------+  +-------------+  +------------------------------------+  +----------+ 
|     440 byte       |  |  6 byte     |  |              64 byte               |  | 2 byte   | 
|                    |  |             |  |                                    |  |          | 
|                    |  |             |  |                                    |  |          | 
|                    |  |  磁盘标识    |  |      四个分区，各占 16 byte         |  | 结束标记  | 
+--------------------+  +-------------+  +------------------------------------+  +----------+ 
```                                                                                         
磁盘标识对应`fdisk -l`里显示的`Disk identifier`

```
[root@localhost ~]# xxd -l 512 /dev/sda
00000000: eb63 9010 8ed0 bc00 b0b8 0000 8ed8 8ec0  .c..............
00000010: fbbe 007c bf00 06b9 0002 f3a4 ea21 0600  ...|.........!..
00000020: 00be be07 3804 750b 83c6 1081 fefe 0775  ....8.u........u
00000030: f3eb 16b4 02b0 01bb 007c b280 8a74 018b  .........|...t..
00000040: 4c02 cd13 ea00 7c00 00eb fe00 0000 0000  L.....|.........
00000050: 0000 0000 0000 0000 0000 0080 0100 0000  ................
00000060: 0000 0000 fffa 9090 f6c2 8074 05f6 c270  ...........t...p
00000070: 7402 b280 ea79 7c00 0031 c08e d88e d0bc  t....y|..1......
00000080: 0020 fba0 647c 3cff 7402 88c2 52be 057c  . ..d|<.t...R..|
00000090: b441 bbaa 55cd 135a 5272 3d81 fb55 aa75  .A..U..ZRr=..U.u
000000a0: 3783 e101 7432 31c0 8944 0440 8844 ff89  7...t21..D.@.D..
000000b0: 4402 c704 1000 668b 1e5c 7c66 895c 0866  D.....f..\|f.\.f
000000c0: 8b1e 607c 6689 5c0c c744 0600 70b4 42cd  ..`|f.\..D..p.B.
000000d0: 1372 05bb 0070 eb76 b408 cd13 730d 5a84  .r...p.v....s.Z.
000000e0: d20f 83de 00be 857d e982 0066 0fb6 c688  .......}...f....
000000f0: 64ff 4066 8944 040f b6d1 c1e2 0288 e888  d.@f.D..........
00000100: f440 8944 080f b6c2 c0e8 0266 8904 66a1  .@.D.......f..f.
00000110: 607c 6609 c075 4e66 a15c 7c66 31d2 66f7  `|f..uNf.\|f1.f.
00000120: 3488 d131 d266 f774 043b 4408 7d37 fec1  4..1.f.t.;D.}7..
00000130: 88c5 30c0 c1e8 0208 c188 d05a 88c6 bb00  ..0........Z....
00000140: 708e c331 dbb8 0102 cd13 721e 8cc3 601e  p..1......r...`.
00000150: b900 018e db31 f6bf 0080 8ec6 fcf3 a51f  .....1..........
00000160: 61ff 265a 7cbe 807d eb03 be8f 7de8 3400  a.&Z|..}....}.4.
00000170: be94 7de8 2e00 cd18 ebfe 4752 5542 2000  ..}.......GRUB .
00000180: 4765 6f6d 0048 6172 6420 4469 736b 0052  Geom.Hard Disk.R
00000190: 6561 6400 2045 7272 6f72 0d0a 00bb 0100  ead. Error......
000001a0: b40e cd10 ac3c 0075 f4c3 0000 0000 0000  .....<.u........
000001b0: 0000 0000 0000 0000 ef4d 7245 0000 8000  .........MrE....
000001c0: 0101 833e dfff 0008 0000 dff7 3f06 0000  ...>........?...
000001d0: 0000 0000 0000 0000 0000 0000 0000 0000  ................
000001e0: 0000 0000 0000 0000 0000 0000 0000 0000  ................
000001f0: 0000 0000 0000 0000 0000 0000 0000 55aa  ..............U.
```

分区对应的结构体如下：
``` c
struct dos_partition {
	unsigned char boot_ind;		/* 0x80 - active */
	unsigned char bh, bs, bc;	/* begin CHS */
	unsigned char sys_ind;
	unsigned char eh, es, ec;	/* end CHS */
	unsigned char start_sect[4];
	unsigned char nr_sects[4];
} __attribute__((packed));
```
已如下第一个分区的信息为例子， boot_ind为 0x80, 代表是可引导分区。start_sect（该分区之前的扇区数）为0x0800,
nr_sects（当前分区的所占的扇区数）为0x063ff7df。    
从二进制的原始信息里看 bh 0x00, bs 0x01, bc 0x01, eh 0x3e es 0xdf ec 0xff，但是根据规则要转换下
```
// 参考 util-linux里 dos_get_partition 的实现
C ==  ((bc) | (((bs) & 0xc0) << 2))
H ==  bh
S ==  ((bs) & 0x3f)
```
结果为 start的 C 0x01 H 0x00 S 0x01 ， end的 C 0x3ff H 0x3e S 0x1f， 与`fdisk -x`查询的结果一致。
``` bash
[root@localhost ~]# xxd -s 446 -l 16 /dev/sda
000001be: 8000 0101 833e dfff 0008 0000 dff7 3f06  .....>........?.
```
``` bash
[root@localhost ~]# fdisk -x /dev/sda
Disk /dev/sda: 50 GiB, 53687091200 bytes, 104857600 sectors
Disk model: HARDDISK
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x45724def

Device     Boot Start       End   Sectors Id Type  Start-C/H/S  End-C/H/S Attrs
/dev/sda1  *     2048 104857566 104855519 83 Linux       1/0/1 1023/62/31    80
```
那么 start C/H/S 1/0/1 怎么对应 起始扇区位置 2048 呢？ 通过`ioctl`获取磁盘的heads和sectors
则对应的LBA == C * heads * sectors + H * sectors + S -1 . 结束位置的CHS无法对应上是程序故意让其C
小于1023，避开校验。因为目前基于不使用chs信息来定位分区的起始和结束位置。
``` c
int blkdev_get_geometry(int fd, unsigned int *h, unsigned int *s)
{
	struct hd_geometry geometry;

	if (ioctl(fd, HDIO_GETGEO, &geometry) == 0) {
		*h = geometry.heads;
		*s = geometry.sectors;
		return 0;
	}
}
```
``` c
    // 只在分区位置小于1024时，才计算是否一致
	if (lba_sector / (cxt->geom.heads * cxt->geom.sectors) < 1024 && lba_sector != chs_sector) {
		fdisk_warnx(cxt, _("Partition %zu: LBA sector %u "
				   "disagrees with C/H/S calculated sector %u"),
				n, lba_sector, chs_sector);
		nerrors++;
	}
```
``` c
static inline void dos_partition_sync_chs(struct dos_partition *p, unsigned long long int part_offset, unsigned int geom_sectors, unsigned int geom_heads)
{
	unsigned long long int start = part_offset + dos_partition_get_start(p);
	unsigned long long int stop = start + dos_partition_get_size(p) - 1;
	unsigned int spc = geom_heads * geom_sectors;
    // 创建新分区，也不让C 超过 1023
	if (start / spc > 1023)
		start = spc * 1024 - 1;
	if (stop / spc > 1023)
		stop = spc * 1024 - 1;

	p->bc = (start / spc) & 0xff;
	p->bh = (start / geom_sectors) % geom_heads;
	p->bs = ((start % geom_sectors + 1) & 0x3f) |
		(((start / spc) >> 2) & 0xc0);

	p->ec = (stop / spc) & 0xff;
	p->eh = (stop / geom_sectors) % geom_heads;
	p->es = ((stop % geom_sectors + 1) & 0x3f) |
		(((stop / spc) >> 2) & 0xc0);
}
```
可以使用`LIBFDISK_DEBUG=all`打印fdisk执行时的详细信息，比如`LIBFDISK_DEBUG=all fdisk -x /dev/sda`，
`LIBFDISK_DEBUG=all LIBBLKID_DEBUG=all fdisk -x /dev/sda` 
参考：   
https://developer.aliyun.com/article/910722  
https://www.cnblogs.com/lsgxeva/p/15641934.html  


## GPT
`GPT` 是新一代的分区，支持128个分区，分区最大18 EB。 磁盘的前512字节是pmbr（又称保护MBR）, 紧接着512字节是gpt_header。
探测磁盘是否是gpt的逻辑在util-linux里的`gpt_probe_label`函数。
``` c
struct gpt_legacy_mbr {
	uint8_t             boot_code[440];
	uint32_t            unique_mbr_signature;
	uint16_t            unknown;
	struct gpt_record   partition_record[4];
	uint16_t            signature;
} __attribute__ ((packed));

```
磁盘上数据分布如下：
```                                                                                                        
+--------------+ +--------------+   +--------------+   +-----------+  +----------------+   +--------------+
|    512 byte  | |  512 byte    |   |128 byte * 128|   |   data    |  | 128 byte * 128 |   |  512 byte    |
|    pmbr      | |  gpt header  |   |32 sector     |   |           |  | 32 sector      |   |  backup gpt  |
|              | |              |   |partition     |   |           |  | partition      |   |              |
+--------------+ +--------------+   +--------------+   +-----------+  +----------------+   +--------------+                                                                                                     
```
gpt hader的数据结构如下：
```
struct gpt_record {
	uint8_t             boot_indicator; /* unused by EFI, set to 0x80 for bootable */
	uint8_t             start_head; /* unused by EFI, pt start in CHS */
	uint8_t             start_sector; /* unused by EFI, pt start in CHS */
	uint8_t             start_track;
	uint8_t             os_type; /* EFI and legacy non-EFI OS types */
	uint8_t             end_head; /* unused by EFI, pt end in CHS */
	uint8_t             end_sector; /* unused by EFI, pt end in CHS */
	uint8_t             end_track; /* unused by EFI, pt end in CHS */
	uint32_t            starting_lba; /* used by EFI - start addr of the on disk pt */
	uint32_t            size_in_lba; /* used by EFI - size of pt in LBA */
} __attribute__ ((packed));
```
如下面所示，分区的os_type 必须是 0xee
```
# xxd -s 446 -l 66 /dev/vdb
000001be: 0000 0200 eeff ffff 0100 0000 ffff bf03  ................
000001ce: 0000 0000 0000 0000 0000 0000 0000 0000  ................
000001de: 0000 0000 0000 0000 0000 0000 0000 0000  ................
000001ee: 0000 0000 0000 0000 0000 0000 0000 0000  ................
000001fe: 55aa                                     U.
```

如下探测gpt_header的数据，signature是 0x5452415020494645LL， 对应 "EFI PART"。
备份的gpt信息位于LBA 0x03bfffff，用于数据存储的LBA从0x22到0x03bfffde。磁盘的标识为
0x67C9FB01-3B4D-41A3-A970-7EC00D8B6B91.分区表位于LBA 0x2,  128个分区，每个分区信息
占128个字节。所以分区表共占16KB， 即32个扇区。

32个扇区，即0x20, 因为分区信息是从LBA 0x2开始， 所以数据是从0x22开始。 与first_usable_lba
代表的值一致。 

备份分区（LBA 0x03bfffff）里alternative_lba 为 0x01。  
```
# xxd -s 512 -l 96 /dev/vdb
00000200: 4546 4920 5041 5254 0000 0100 5c00 0000  EFI PART....\...
00000210: acae 6245 0000 0000 0100 0000 0000 0000  ..bE............
00000220: ffff bf03 0000 0000 2200 0000 0000 0000  ........".......
00000230: deff bf03 0000 0000 01fb c967 4d3b a341  ...........gM;.A
00000240: a970 7ec0 0d8b 6b91 0200 0000 0000 0000  .p~...k.........
00000250: 8000 0000 8000 0000 e647 569f 0000 0000  .........GV.....
```

``` c
struct gpt_header {
	uint64_t            signature; /* header identification */
	uint32_t            revision; /* header version */
	uint32_t            size; /* in bytes */
	uint32_t            crc32; /* header CRC checksum */
	uint32_t            reserved1; /* must be 0 */
	uint64_t            my_lba; /* LBA of block that contains this struct (LBA 1) */
	uint64_t            alternative_lba; /* backup GPT header */
	uint64_t            first_usable_lba; /* first usable logical block for partitions */
	uint64_t            last_usable_lba; /* last usable logical block for partitions */
	struct gpt_guid     disk_guid; /* unique disk identifier */
	uint64_t            partition_entry_lba; /* LBA of start of partition entries array */
	uint32_t            npartition_entries; /* total partition entries - normally 128 */
	uint32_t            sizeof_partition_entry; /* bytes for each GUID pt */
	uint32_t            partition_entry_array_crc32; /* partition CRC checksum */
	uint8_t             reserved2[512 - 92]; /* must all be 0 */
} __attribute__ ((packed));
```
如下是第一个分区的信息：
```
# xxd -s 1024 -l 128 /dev/vdb
00000400: af3d c60f 8384 7247 8e79 3d69 d847 7de4  .=....rG.y=i.G}.
00000410: 36f8 5db3 e802 e749 ae18 0438 31f0 df05  6.]....I...81...
00000420: 0008 0000 0000 0000 ffff 3f00 0000 0000  ..........?.....
00000430: 0000 0000 0000 0000 7000 7200 6900 6d00  ........p.r.i.m.
00000440: 6100 7200 7900 0000 0000 0000 0000 0000  a.r.y...........
00000450: 0000 0000 0000 0000 0000 0000 0000 0000  ................
00000460: 0000 0000 0000 0000 0000 0000 0000 0000  ................
00000470: 0000 0000 0000 0000 0000 0000 0000 0000  ................
```
对照下面的结构性可是看出，lba_start是 0x0800，lba_end 是 0x3fffff, name是 primary
``` c
struct gpt_entry {
	struct gpt_guid     type; /* purpose and type of the partition */
	struct gpt_guid     partition_guid;
	uint64_t            lba_start;
	uint64_t            lba_end;
	uint64_t            attrs;
	uint16_t            name[GPT_PART_NAME_LEN];
}  __attribute__ ((packed));
```
## 文件系统在磁盘上的布局

ext4文件系统前1024个字节为0，后面的数据如下：
```
# xxd -s 1024 -l 64 /dev/vdb
00000400: 0000 0a00 0000 2800 0000 0200 3ffb 2600  ......(.....?.&.
00000410: f5ff 0900 0000 0000 0200 0000 0200 0000  ................
00000420: 0080 0000 0080 0000 0020 0000 0000 0000  ......... ......
00000430: 75e5 b668 0000 ffff 53ef 0100 0100 0000  u..h....S.......
```
对应`struct ext4_super_block` 可以看到 s_magic 是 0xef53 , 用于标识该文件系统是
ext4。
``` c
struct ext4_super_block {
/*00*/	__le32	s_inodes_count;		/* Inodes count */
	__le32	s_blocks_count_lo;	/* Blocks count */
	__le32	s_r_blocks_count_lo;	/* Reserved blocks count */
	__le32	s_free_blocks_count_lo;	/* Free blocks count */
/*10*/	__le32	s_free_inodes_count;	/* Free inodes count */
	__le32	s_first_data_block;	/* First Data Block */
	__le32	s_log_block_size;	/* Block size */
	__le32	s_log_cluster_size;	/* Allocation cluster size */
/*20*/	__le32	s_blocks_per_group;	/* # Blocks per group */
	__le32	s_clusters_per_group;	/* # Clusters per group */
	__le32	s_inodes_per_group;	/* # Inodes per group */
	__le32	s_mtime;		/* Mount time */
/*30*/	__le32	s_wtime;		/* Write time */
	__le16	s_mnt_count;		/* Mount count */
	__le16	s_max_mnt_count;	/* Maximal mount count */
	__le16	s_magic;		/* Magic signature */
	__le16	s_state;		/* File system state */
	__le16	s_errors;		/* Behaviour when detecting errors */
	__le16	s_minor_rev_level;	/* minor revision level */
	.........
}
#define EXT4_SUPER_MAGIC	0xEF53
```
xfs一开始的数据就是superblock,并不预留1024个字节，且第一个字段是magic。
``` c
typedef struct xfs_sb {
	uint32_t	sb_magicnum;	/* magic number == XFS_SB_MAGIC */
	uint32_t	sb_blocksize;	/* logical block size, bytes */
	xfs_rfsblock_t	sb_dblocks;	/* number of data blocks */
	xfs_rfsblock_t	sb_rblocks;	/* number of realtime blocks */
	xfs_rtblock_t	sb_rextents;	/* number of realtime extents */
	uuid_t		sb_uuid;	/* user-visible file system unique id */
	xfs_fsblock_t	sb_logstart;	/* starting block of log if internal */
	xfs_ino_t	sb_rootino;	/* root inode number */
	xfs_ino_t	sb_rbmino;	/* bitmap inode for realtime extents */
	xfs_ino_t	sb_rsumino;	/* summary inode for rt bitmap */
	....
} xfs_sb_t;
#define	XFS_SB_MAGIC		0x58465342	/* 'XFSB' */
```

如果对磁盘/dev/vdb直接做文件系统后，又使用fdisk创建mbr分区表，那么文件系统就无法再次被识别。 
因为ext4的magic被清零了。可以用如下方法恢复：
1. dd if=/dev/zero of=/dev/vdb bs=512 count=1  (前512字节清零)
2. 填充magic位置为 0xeef5,   start: 1080 == 1024(预留字节数) + 56（magic字段偏移） size: 2字节

如果创建了gpt分区，因为gpt的数据使用了17k的数据，覆盖了ext4的第一个Superblock, 所以直接用fsck修复。
fsck会自动查找可用的superblock用于恢复。同时dd将前1024个字节置零。