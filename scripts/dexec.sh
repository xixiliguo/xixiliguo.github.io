#!/bin/bash

# 容器登录脚本 - 通过模糊匹配容器名并进入容器

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 显示使用方法
usage() {
    echo "用法: $0 <容器名关键词>"
    echo "示例: $0 mysql"
    echo "      $0 nginx-prod"
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -l, --list     列出所有匹配的容器（不登录）"
    exit 1
}

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${RED}错误: 缺少容器名参数${NC}"
    usage
fi

# 解析参数
LIST_ONLY=false
CONTAINER_KEYWORD=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -l|--list)
            LIST_ONLY=true
            shift
            ;;
        *)
            CONTAINER_KEYWORD="$1"
            shift
            ;;
    esac
done

# 检查docker命令是否存在
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: 未找到docker命令${NC}"
    exit 1
fi

# 获取匹配的容器列表
get_matching_containers() {
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -i "$CONTAINER_KEYWORD" || true
}

# 获取容器名列表（只取第一列）
get_container_names() {
    docker ps --format "{{.Names}}" | grep -i "$CONTAINER_KEYWORD" || true
}

# 主逻辑
echo -e "${GREEN}正在搜索匹配 '${CONTAINER_KEYWORD}' 的容器...${NC}"
echo ""

# 获取匹配的容器
MATCHING_CONTAINERS=$(get_container_names)

if [ -z "$MATCHING_CONTAINERS" ]; then
    echo -e "${RED}未找到匹配 '${CONTAINER_KEYWORD}' 的运行中容器${NC}"
    echo ""
    echo "当前运行中的容器："
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    exit 1
fi

# 统计匹配数量
COUNT=$(echo "$MATCHING_CONTAINERS" | wc -l)

if [ "$LIST_ONLY" = true ]; then
    echo -e "${YELLOW}找到 ${COUNT} 个匹配的容器:${NC}"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -i "$CONTAINER_KEYWORD"
    exit 0
fi

# 如果匹配多个容器，让用户选择
if [ $COUNT -gt 1 ]; then
    echo -e "${YELLOW}找到 ${COUNT} 个匹配的容器，请选择要登录的容器:${NC}"
    echo ""

    # 显示匹配的容器列表（带编号）
    i=1
    declare -a CONTAINER_ARRAY
    while IFS= read -r container; do
        # 获取容器详细信息
        IMAGE=$(docker inspect "$container" --format='{{.Image}}' | cut -d':' -f2 | cut -d'/' -f2-)
        STATUS=$(docker ps --filter "name=$container" --format "{{.Status}}")
        echo -e "  ${GREEN}[$i]${NC} $container (镜像: $IMAGE, 状态: $STATUS)"
        CONTAINER_ARRAY[$i]="$container"
        ((i++))
    done <<< "$MATCHING_CONTAINERS"

    echo ""
    read -p "请输入编号 [1-$COUNT]: " choice

    # 验证输入
    if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt $COUNT ]; then
        echo -e "${RED}无效的选择${NC}"
        exit 1
    fi

    CONTAINER_NAME="${CONTAINER_ARRAY[$choice]}"
else
    CONTAINER_NAME="$MATCHING_CONTAINERS"
fi

# 检查容器是否在运行
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}容器 '$CONTAINER_NAME' 不在运行状态${NC}"
    exit 1
fi

echo -e "${GREEN}正在进入容器: ${CONTAINER_NAME}${NC}"
echo -e "${YELLOW}提示: 输入 'exit' 或按 Ctrl+D 退出容器${NC}"
echo ""

# 尝试进入容器
# 首先尝试使用 bash，如果失败则使用 sh
if docker exec -it "$CONTAINER_NAME" bash 2>/dev/null; then
    exit 0
elif docker exec -it "$CONTAINER_NAME" sh 2>/dev/null; then
    exit 0
else
    echo -e "${RED}无法进入容器 '${CONTAINER_NAME}'，可能缺少 shell 环境${NC}"
    exit 1
fi
