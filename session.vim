let SessionLoad = 1
let s:so_save = &g:so | let s:siso_save = &g:siso | setg so=0 siso=0 | setl so=-1 siso=-1
let v:this_session=expand("<sfile>:p")
silent only
silent tabonly
cd ~/Dev/mini-language-server
if expand('%') == '' && !&modified && line('$') <= 1 && getline(1) == ''
  let s:wipebuf = bufnr('%')
endif
let s:shortmess_save = &shortmess
if &shortmess =~ 'A'
  set shortmess=aoOA
else
  set shortmess=aoO
endif
badd +1 packages/llm/src/llm/llms/base.agent.ts
badd +52 packages/llm/src/llm/llms/claude.agent.ts
badd +1 packages/llm_app/src/index.css
badd +23 packages/llm_app/src/routes/chat/chat_manager.tsx
badd +10 packages/llm_app/src/main.tsx
badd +13 packages/llm_app/src/routes/__root.tsx
badd +8 packages/llm_app/src/routes/chat/index.lazy.tsx
badd +3 packages/llm_app/src/components/modal.tsx
badd +1 packages/llm_app/src/routes/chat/chat.tsx
badd +4 packages/llm_app/vite.config.ts
argglobal
%argdel
$argadd ./
tabnew +setlocal\ bufhidden=wipe
tabrewind
edit packages/llm/src/llm/llms/claude.agent.ts
argglobal
balt packages/llm/src/llm/llms/base.agent.ts
setlocal fdm=manual
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=100
setlocal fml=1
setlocal fdn=20
setlocal fen
silent! normal! zE
2,9fold
17,19fold
16,21fold
11,22fold
28,44fold
46,48fold
56,60fold
67,69fold
71,75fold
70,76fold
66,78fold
64,79fold
63,80fold
62,82fold
51,83fold
50,84fold
93,98fold
92,99fold
100,102fold
91,104fold
86,109fold
24,110fold
let &fdl = &fdl
let s:l = 1 - ((0 * winheight(0) + 21) / 42)
if s:l < 1 | let s:l = 1 | endif
keepjumps exe s:l
normal! zt
keepjumps 1
normal! 0
lcd ~/Dev/mini-language-server
tabnext
edit ~/Dev/mini-language-server/packages/llm_app/src/routes/chat/chat_manager.tsx
argglobal
balt ~/Dev/mini-language-server/packages/llm_app/src/main.tsx
setlocal fdm=manual
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=100
setlocal fml=1
setlocal fdn=20
setlocal fen
silent! normal! zE
22,28fold
21,29fold
31,33fold
41,45fold
37,47fold
49,52fold
55,57fold
54,58fold
62,65fold
61,66fold
60,67fold
74,84fold
96,105fold
114,123fold
86,124fold
85,125fold
128,139fold
127,140fold
126,141fold
72,142fold
143,151fold
71,152fold
157,159fold
153,161fold
70,162fold
7,164fold
let &fdl = &fdl
let s:l = 23 - ((22 * winheight(0) + 21) / 42)
if s:l < 1 | let s:l = 1 | endif
keepjumps exe s:l
normal! zt
keepjumps 23
normal! 036|
lcd ~/Dev/mini-language-server
tabnext 2
if exists('s:wipebuf') && len(win_findbuf(s:wipebuf)) == 0 && getbufvar(s:wipebuf, '&buftype') isnot# 'terminal'
  silent exe 'bwipe ' . s:wipebuf
endif
unlet! s:wipebuf
set winheight=1 winwidth=20
let &shortmess = s:shortmess_save
let s:sx = expand("<sfile>:p:r")."x.vim"
if filereadable(s:sx)
  exe "source " . fnameescape(s:sx)
endif
let &g:so = s:so_save | let &g:siso = s:siso_save
set hlsearch
nohlsearch
doautoall SessionLoadPost
unlet SessionLoad
" vim: set ft=vim :
