(self.webpackChunkvuepress_blog=self.webpackChunkvuepress_blog||[]).push([[446],{8596:(n,t,e)=>{"use strict";e.r(t),e.d(t,{data:()=>i});const i={key:"v-2240f3ff",path:"/algorithm/algorithm-dfs.html",title:"力扣: DFS相关题解",lang:"en-US",frontmatter:{title:"力扣: DFS相关题解",date:"2021-04-04T12:50:43.000Z",draft:!1},excerpt:"",headers:[],filePathRelative:"algorithm/algorithm-dfs.md",git:{updatedTime:1626591395e3,contributors:[]}}},3931:(n,t,e)=>{"use strict";e.r(t),e.d(t,{default:()=>s});const i=(0,e(6252).uE)('<p>记录自己做过的的一些DFS的题解xxx</p><p>78: 子集</p><div class="language-golang ext-golang"><pre class="language-golang"><code>func subsets(nums []int) [][]int {\n\tres := [][]int{}\n\tdfs(nums, -1, []int{}, &amp;res)\n\treturn res\n}\n\nfunc dfs(nums []int, cur int, c []int, res *[][]int) {\n\t// fmt.Println(nums, cur, c, *res)\n\t*res = append(*res, c)\n\n\tfor i := cur + 1; i &lt; len(nums); i++ {\n\t\tclone := make([]int, len(c), len(c)+1)\n\t\tcopy(clone, c)\n\t\tclone = append(clone, nums[i])\n\t\tdfs(nums, i, clone, res)\n\t}\n\treturn\n}\n</code></pre></div><p>90: 子集II</p><div class="language-golang ext-golang"><pre class="language-golang"><code>func subsetsWithDup(nums []int) [][]int {\n\tres := [][]int{}\n\tsort.Ints(nums)\n\tdfs(nums, -1, []int{}, &amp;res)\n\treturn res\n}\n\nfunc dfs(nums []int, cur int, c []int, res *[][]int) {\n\t// fmt.Println(nums, cur, c, *res)\n\t*res = append(*res, c)\n\n\tfor i := cur + 1; i &lt; len(nums); i++ {\n\t\tif i != cur+1 &amp;&amp; nums[i] == nums[i-1] {\n\t\t\tcontinue\n\t\t}\n\t\tclone := make([]int, len(c), len(c)+1)\n\t\tcopy(clone, c)\n\t\tclone = append(clone, nums[i])\n\t\tdfs(nums, i, clone, res)\n\t}\n\treturn\n}\n</code></pre></div><p>491: 递增子序列</p><div class="language-golang ext-golang"><pre class="language-golang"><code>func findSubsequences(nums []int) [][]int {\n\tres := [][]int{}\n\tdfs(nums, -1, []int{}, &amp;res)\n\treturn res\n}\n\nfunc dfs(nums []int, cur int, c []int, res *[][]int) {\n\t// fmt.Println(nums, cur, c, *res)\n\tif len(c) &gt;= 2 {\n\t\t*res = append(*res, c)\n\t}\n\nskip:\n\tfor i := cur + 1; i &lt; len(nums); i++ {\n\t\tfor m := cur + 1; m &lt; i; m++ {\n\t\t\tif nums[m] == nums[i] {\n\t\t\t\tcontinue skip\n\t\t\t}\n\t\t}\n\t\tif cur &gt;= 0 &amp;&amp; nums[cur] &gt; nums[i] {\n\t\t\tcontinue\n\t\t}\n\n\t\tclone := make([]int, len(c), len(c)+1)\n\t\tcopy(clone, c)\n\t\tclone = append(clone, nums[i])\n\t\tdfs(nums, i, clone, res)\n\t}\n\treturn\n}\n</code></pre></div><p>39: 组合总和</p><div class="language-golang ext-golang"><pre class="language-golang"><code>func combinationSum(candidates []int, target int) [][]int {\n\tres := [][]int{}\n\tsort.Ints(candidates)\n\tdfs(candidates, target, -1, []int{}, &amp;res)\n\treturn res\n}\nfunc dfs(candidates []int, remain int, start int, c []int, res *[][]int) {\n\tif remain &lt; 0 {\n\t\treturn\n\t}\n\tif remain == 0 {\n\t\t*res = append(*res, c)\n\t}\n\n\tfor i := start + 1; i &lt; len(candidates); i++ {\n\t\tvalue := candidates[i]\n\t\tfor m := 1; m*value &lt;= remain; m++ {\n\t\t\tclone := make([]int, len(c), len(c)+m)\n\t\t\tcopy(clone, c)\n\t\t\tfor n := 1; n &lt;= m; n++ {\n\t\t\t\tclone = append(clone, value)\n\t\t\t}\n\t\t\tdfs(candidates, remain-m*value, i, clone, res)\n\t\t}\n\t}\n\treturn\n}\n</code></pre></div><p>40: 组合总和II</p><div class="language-golang ext-golang"><pre class="language-golang"><code>func combinationSum2(candidates []int, target int) [][]int {\n\tres := [][]int{}\n\tsort.Ints(candidates)\n\tdfs(candidates, target, -1, []int{}, &amp;res)\n\treturn res\n}\nfunc dfs(candidates []int, remain int, start int, c []int, res *[][]int) {\n\tif remain &lt; 0 {\n\t\treturn\n\t}\n\tif remain == 0 {\n\t\t*res = append(*res, c)\n\t}\n\n\tfor i := start + 1; i &lt; len(candidates); i++ {\n\t\tvalue := candidates[i]\n\t\tif i != start+1 &amp;&amp; candidates[i] == candidates[i-1] {\n\t\t\tcontinue\n\t\t}\n\t\tif value &gt; remain {\n\t\t\tcontinue\n\t\t}\n\t\tclone := make([]int, len(c), len(c)+1)\n\t\tcopy(clone, c)\n\t\tclone = append(clone, value)\n\t\tdfs(candidates, remain-value, i, clone, res)\n\t}\n\treturn\n}\n</code></pre></div><p>216: 组合总和 III</p><div class="language-golang ext-golang"><pre class="language-golang"><code>func combinationSum3(k int, n int) [][]int {\n\tres := [][]int{}\n\tdfs([]int{1, 2, 3, 4, 5, 6, 7, 8, 9}, k, n, -1, []int{}, &amp;res)\n\treturn res\n}\nfunc dfs(candidates []int, remainNums int, remainTarget int, start int, c []int, res *[][]int) {\n\tif remainNums == 0 &amp;&amp; remainTarget == 0 {\n\t\t*res = append(*res, c)\n\t\treturn\n\t}\n\tif remainNums &lt;= 0 {\n\t\treturn\n\t}\n\n\tfor i := start + 1; i &lt; len(candidates); i++ {\n\t\tvalue := candidates[i]\n\n\t\tif value &gt; remainTarget {\n\t\t\tcontinue\n\t\t}\n\t\tclone := make([]int, len(c), len(c)+1)\n\t\tcopy(clone, c)\n\t\tclone = append(clone, value)\n\t\tdfs(candidates, remainNums-1, remainTarget-value, i, clone, res)\n\t}\n\treturn\n}\n</code></pre></div><p>46: 全排列</p><div class="language-golang ext-golang"><pre class="language-golang"><code>func permute(nums []int) [][]int {\n\tres := [][]int{}\n\tvisited := make([]bool, len(nums))\n\tdfs(nums, visited, len(nums), []int{}, &amp;res)\n\treturn res\n}\nfunc dfs(nums []int, visited []bool, remain int, c []int, res *[][]int) {\n\tif remain == 0 {\n\t\t*res = append(*res, c)\n\t}\n\n\tfor i := 0; i &lt; len(nums); i++ {\n\t\tif visited[i] == true {\n\t\t\tcontinue\n\t\t}\n\t\tclone := make([]int, len(c), len(c)+1)\n\t\tcopy(clone, c)\n\t\tclone = append(clone, nums[i])\n\t\tvisited[i] = true\n\t\tdfs(nums, visited, remain-1, clone, res)\n\t\tvisited[i] = false\n\t}\n\treturn\n}\n</code></pre></div><p>47: 全排列II</p><div class="language-golang ext-golang"><pre class="language-golang"><code>func permuteUnique(nums []int) [][]int {\n\tres := [][]int{}\n\tsort.Ints(nums)\n\tvisited := make([]bool, len(nums))\n\tdfs(nums, visited, len(nums), []int{}, &amp;res)\n\treturn res\n}\nfunc dfs(nums []int, visited []bool, remain int, c []int, res *[][]int) {\n\t// fmt.Println(nums, visited, remain, c, res)\n\tif remain == 0 {\n\t\t*res = append(*res, c)\n\t}\n\tfor i := 0; i &lt; len(nums); i++ {\n\t\tif visited[i] == true {\n\t\t\tcontinue\n\t\t}\n\t\tif i &gt; 0 &amp;&amp; visited[i-1] == false &amp;&amp; nums[i] == nums[i-1] {\n\t\t\tcontinue\n\t\t}\n\t\tclone := make([]int, len(c), len(c)+1)\n\t\tcopy(clone, c)\n\t\tclone = append(clone, nums[i])\n\t\tvisited[i] = true\n\t\tdfs(nums, visited, remain-1, clone, res)\n\t\tvisited[i] = false\n\t}\n\treturn\n}\n</code></pre></div>',17),s={render:function(n,t){return i}}}}]);