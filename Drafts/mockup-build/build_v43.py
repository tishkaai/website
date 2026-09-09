#!/usr/bin/env python3
# Build mockup v4.3.1: brief_10 style EXACTLY, Tishka colours only.
# v4.3.1: lanes grid removed; standup focus rows = ONE control (tick), place/owner is plain mono text.
import re, pathlib

SRC = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path(str(SRC.parent / 'dashboard-lanes-mockup-v5.html'))

css = (SRC / 'style-extracted.css').read_text()
shell = (SRC / 'shell.html').read_text()

# ---------- shell swaps (brand, user, nav) ----------
shell = shell.replace('<span class="text-sidebar-primary-foreground font-mono text-xs">OC</span>',
                      '<span class="text-sidebar-primary-foreground font-mono text-xs">T</span>')
shell = shell.replace('<span class="display text-lg">Ops Console</span>',
                      '<span class="display text-lg">Tishka</span>')
shell = shell.replace('<span class="text-sm font-medium truncate">Kai</span>',
                      '<span class="text-sm font-medium truncate">Pete</span>')
shell = shell.replace('hellokaibot@gmail.com', 'pete@belmontrecruitment.co.uk')
shell = shell.replace('justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">K<',
                      'justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">P<')

shell = re.sub(r'<a data-sidebar="menu-button"[^>]*>.*?</a>',
               lambda m: re.sub(r'href="/[a-z]*"', 'href="#" data-discover="false"', m.group(0)),
               shell, flags=re.S)

views = ['brief', 'clients', 'leads', 'delivery', 'reporting', 'finance']
parts = shell.split('<a data-sidebar="menu-button"')
rebuilt = parts[0]
for i, part in enumerate(parts[1:]):
    if i < len(views):
        rebuilt += '<a data-sidebar="menu-button" data-view="' + views[i] + '"' + part
    else:
        rebuilt += '<a data-sidebar="menu-button"' + part
shell = rebuilt

m = re.search(r'<a data-sidebar="menu-button"[^>]*data-view="finance"[^>]*>.*?</a>', shell, re.S)
fin = m.group(0)
files_item = fin.replace('data-view="finance"', 'data-view="files"').replace('>Finance<', '>Files<')
shell = shell.replace(fin, fin + files_item, 1)

shell = shell.replace('id="radix-_r_0_"', 'id="userbtn"')

# ---------- shared markup fragments (their exact classes) ----------
BTN_PRIMARY = ('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium '
    'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none '
    'disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground '
    'shadow-xs hover:bg-primary/90 h-8 px-3 text-xs')
BTN_OUTLINE = ('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium '
    'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none '
    'disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-transparent '
    'shadow-xs hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs')
BTN_TICK = 'flex flex-1 items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary'

CHIP_OK = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] whitespace-nowrap bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)] border-[color-mix(in_oklab,var(--success)_35%,transparent)]'
CHIP_BAD = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] whitespace-nowrap bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] text-[var(--destructive)] border-[color-mix(in_oklab,var(--destructive)_32%,transparent)]'
CHIP_WARN = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] whitespace-nowrap bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color-mix(in_oklab,var(--warning)_75%,black)] border-[color-mix(in_oklab,var(--warning)_40%,transparent)]'
CHIP_MID = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] whitespace-nowrap bg-secondary text-secondary-foreground border-border'
CHIP_CAT = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] whitespace-nowrap bg-[color-mix(in_oklab,var(--chart-1)_14%,transparent)] text-[var(--chart-1)] border-[color-mix(in_oklab,var(--chart-1)_35%,transparent)]'

ICON_CHECK = ('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" '
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
    'class="lucide lucide-circle-check mt-0.5 size-4 shrink-0 text-[var(--success)]" aria-hidden="true">'
    '<circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>')
ICON_ALERT = ('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" '
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
    'class="lucide lucide-triangle-alert mt-0.5 size-4 shrink-0 text-[var(--destructive)]" aria-hidden="true">'
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>'
    '<path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>')
ICON_DOT = ('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" '
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
    'class="lucide lucide-circle tickdot mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true">'
    '<circle cx="12" cy="12" r="10"></circle></svg>')

CARD = 'rounded-lg border border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.03)]'
CARD_HEAD = 'flex items-center justify-between gap-3 border-b border-border px-4 py-3'
CARD_TITLE = 'flex items-baseline gap-3'

def card(head_title, head_label, body, right=''):
    r = '<div class="flex items-center gap-2">' + right + '</div>' if right else ''
    return (f'<section class="{CARD}"><div class="{CARD_HEAD}"><div class="{CARD_TITLE}">'
            f'<h2 class="text-base font-medium font-sans tracking-tight">{head_title}</h2>'
            f'<span class="label-mono">{head_label}</span></div>{r}</div>'
            f'<div class="p-4">{body}</div></section>')

def stat(label, val, desc):
    return (f'<div class="px-4 py-3.5"><div class="label-mono">{label}</div>'
            f'<div class="num mt-1 text-2xl md:text-[1.75rem] leading-none">{val}</div>'
            f'<div class="mt-1.5 text-xs text-muted-foreground">{desc}</div></div>')

def act_btn(label, who=None, jump=None, ctx=None, primary=False):
    cls = BTN_PRIMARY if primary else BTN_OUTLINE
    attrs = ''
    if jump: attrs += f' data-jump="{jump}"'
    if ctx: attrs += f' data-ctx="{ctx}"'
    whohtml = f'<span class="label-mono">{who}</span>' if who else ''
    return f'<button type="button" class="{cls}"{attrs}>{label}{whohtml}</button>'

BTN_GO = ('inline-flex items-center justify-center rounded-md border border-input bg-transparent shadow-xs '
    'hover:bg-accent h-7 w-7 shrink-0 [&_svg]:size-3.5')
ICON_ARROW = ('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" '
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
    'class="lucide lucide-arrow-right" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>')
def go_btn(title, jump):
    return f'<button type="button" class="{BTN_GO}" data-jump="{jump}" title="{title}">{ICON_ARROW}</button>'
def win_li(text, action=''):
    return f'<li class="flex gap-2.5 text-sm">{ICON_CHECK}<span>{text}</span>{action}</li>'
def risk_li(text, goto, target):
    return (f'<li class="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1 -mx-2 text-sm '
            f'transition-colors hover:bg-accent" data-goto="{goto}" data-target="{target}">'
            f'{ICON_ALERT}<span class="flex-1">{text}</span></li>')

def tick_item(text):
    return (f'<li class="flex items-start gap-2.5"><button type="button" class="{BTN_TICK} tick-item">'
            f'{ICON_DOT}<span class="ticktext">{text}</span></button></li>')

def today_li(time, chip_cls, chip, title, sub, note, action=''):
    s = f'<div class="text-xs text-muted-foreground">{sub}</div>' if sub else ''
    n = f'<div class="mt-1 border-l-2 border-[var(--chart-1)]/40 pl-2 text-xs text-muted-foreground">{note}</div>' if note else ''
    a = f'<div class="mt-1.5">{action}</div>' if action else ''
    return (f'<li class="relative"><span class="absolute -left-[1.32rem] top-1.5 size-2 rounded-full bg-[var(--chart-1)]"></span>'
            f'<div class="flex flex-wrap items-center gap-2"><span class="num text-xs text-muted-foreground">{time}</span>'
            f'<span class="{chip_cls}">{chip}</span></div>'
            f'<div class="mt-0.5 text-sm font-medium">{title}</div>{s}{n}{a}</li>')

def wait_li(name, desc, sev_chip, who, action):
    return (f'<li class="flex gap-3 py-2.5 first:pt-0"><div class="min-w-0 flex-1">'
            f'<div class="text-sm font-medium">{name}</div><div class="text-sm text-muted-foreground">{desc}</div>'
            f'<div class="mt-1 flex flex-wrap items-center gap-2">{sev_chip}<span class="label-mono">{who}</span>{action}</div>'
            f'</div></li>')

# ---------- override css: tishka colours + chat panel ----------
OVERRIDE = '''
/* ==== TISHKA COLOURS (only change: the palette. everything else is brief_10) ==== */
:root {
  --background:#f6f6f3; --foreground:#17171b; --card:#ffffff; --card-foreground:#17171b;
  --popover:#ffffff; --popover-foreground:#17171b; --primary:#17171b; --primary-foreground:#ffffff;
  --secondary:#ecece6; --secondary-foreground:#17171b; --muted:#ecece6; --muted-foreground:#5b5b64;
  --accent:#ecece6; --accent-foreground:#17171b; --destructive:#d43f3f; --destructive-foreground:#ffffff;
  --border:#e3e3dc; --input:#e3e3dc; --ring:#17171b;
  --success:#0b7a52; --success-foreground:#ffffff; --warning:#a3701a; --warning-foreground:#ffffff;
  --info:#9a3b12; --info-foreground:#ffffff;
  --chart-1:#0b7a52; --chart-2:#9a3b12; --chart-3:#a3701a; --chart-4:#d43f3f; --chart-5:#5b5b64;
  --sidebar:#ecece6; --sidebar-foreground:#17171b; --sidebar-accent:#ffffff; --sidebar-accent-foreground:#17171b;
  --sidebar-border:#e3e3dc; --sidebar-primary:#17171b; --sidebar-primary-foreground:#ffffff; --sidebar-ring:#17171b;
}
.dark {
  --background:#0e0e10; --foreground:#f2f2f0; --card:#161619; --card-foreground:#f2f2f0;
  --popover:#161619; --popover-foreground:#f2f2f0; --primary:#f2f2f0; --primary-foreground:#0e0e10;
  --secondary:#0a0a0c; --secondary-foreground:#f2f2f0; --muted:#0a0a0c; --muted-foreground:#a1a1a6;
  --accent:#0a0a0c; --accent-foreground:#f2f2f0; --destructive:#ff5c5c; --destructive-foreground:#0e0e10;
  --border:#2a2a2e; --input:#2a2a2e; --ring:#f2f2f0;
  --success:#2fbf7f; --success-foreground:#0e0e10; --warning:#d9a441; --warning-foreground:#0e0e10;
  --info:#e08d5a; --info-foreground:#0e0e10;
  --chart-1:#2fbf7f; --chart-2:#e08d5a; --chart-3:#d9a441; --chart-4:#ff5c5c; --chart-5:#a1a1a6;
  --sidebar:#0a0a0c; --sidebar-foreground:#f2f2f0; --sidebar-accent:#161619; --sidebar-accent-foreground:#f2f2f0;
  --sidebar-border:#2a2a2e; --sidebar-primary:#f2f2f0; --sidebar-primary-foreground:#0e0e10; --sidebar-ring:#f2f2f0;
}
html { background: var(--background); }

.hl { box-shadow: 0 0 0 2px var(--ring); background: var(--accent) !important; border-radius: 10px;
  transition: box-shadow .25s, background .25s; }
tr.hl td { background: var(--accent) !important; }

.modal-backdrop { position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,0.4); display: none;
  align-items: center; justify-content: center; }
.modal-backdrop.open { display: flex; }
.modal { width: 320px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: 0 20px 60px rgba(0,0,0,0.25); padding: 16px; }

#chatbtn[aria-pressed="true"] { background: var(--primary); color: var(--primary-foreground); }

.tick-item.done .tickdot { color: var(--success); }
.tick-item.done .ticktext { text-decoration: line-through; color: var(--muted-foreground); }

.chatpanel { position: sticky; top: 0; height: 100vh; flex: 0 0 auto; width: 0; overflow: hidden;
  display: flex; flex-direction: column; background: var(--card); border-left: 0;
  transition: width .25s ease; }
.chatpanel.open { width: 341px; border-left: 1px solid var(--border); }
.chatpanel > * { width: 340px; flex: 0 0 340px; max-width: 100vw; }
.cp-head { padding: 14px 16px; border-bottom: 1px solid var(--border); }
.cp-head .t { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
.cp-head .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); }
.cp-body { flex: 1 1 auto !important; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 9px; }
.msg { max-width: 88%; padding: 8px 12px; border-radius: 12px; font-size: 13px; line-height: 1.5; }
.msg.ai { background: var(--secondary); color: var(--secondary-foreground); border: 1px solid var(--border);
  border-bottom-left-radius: 4px; }
.msg.me { background: var(--primary); color: var(--primary-foreground); align-self: flex-end;
  border-bottom-right-radius: 4px; }
.msg .msrc { display: block; margin-top: 5px; font-family: var(--font-mono); font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.65; }
.cp-input { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid var(--border); }
.cp-input input { flex: 1; border: 1px solid var(--input); background: transparent; border-radius: var(--radius);
  padding: 8px 12px; font-size: 13px; color: var(--foreground); outline: none; }
.cp-input input:focus { border-color: var(--ring); }
.cp-input button { border: 1px solid var(--primary); background: var(--primary); color: var(--primary-foreground);
  border-radius: var(--radius); padding: 8px 13px; font-weight: 500; cursor: pointer; font-size: 13px; }
'''

# ---------- page content ----------
chips = ('<div class="mt-4 flex flex-wrap gap-2">'
    f'<span class="{CHIP_MID}">2 waiting for approval</span>'
    f'<span class="{CHIP_BAD}">1 blocked on client</span>'
    f'<span class="{CHIP_WARN}">1 overdue invoice</span>'
    f'<span class="{CHIP_MID}">26.9h given back this week</span>'
    '</div>')
header = ('<header class="border-b border-border pb-6 mb-6"><div class="label-mono">Morning brief · Saturday 5 September</div>'
    '<h1 class="mt-2 text-3xl md:text-[2.6rem] leading-[1.05] max-w-3xl">3 things decide today. '
    '<span class="text-muted-foreground">Everything else is noise until they move.</span></h1>'
    + chips + '</header>')

stats_row = ('<div class="grid grid-cols-2 divide-x divide-y divide-border rounded-lg border border-border bg-card '
    'md:grid-cols-4 md:divide-y-0">'
    + stat('Time back today', '1.3h', 'Work Tishka did instead of you')
    + stat('Time back, 7 days', '26.9h', '36 handled tasks')
    + stat('Time back, 14 days', '53.7h', 'Rolling total')
    + stat('Live retainer value', '£15,500', 'Per month across active clients')
    + '</div>')

def group(label, lis):
    return f'<div><div class="label-mono mb-2">{label}</div><ul class="space-y-1.5">{lis}</ul></div>'

wins = (win_li('Harborne Dental shortlist of 2 sent. Interviews set for Tuesday.')
    + win_li('Kestrel Kitchens CV pack built from the 4 shortlisted CVs.')
    + win_li('Two invoices paid this week: Kestrel £1,150 Thu, Harborne £1,200 Tue.')
    + win_li('Leads: 3 companies assessed, 2 first-touch drafts written.'))
risks = (risk_li("Belmont Staffing invoice 12 days overdue. Retainer at risk before Monday's call.",
    'finance', 'item-inv-1041')
    + risk_li('Millbrook jobs sheet quiet for 3 days. Warehouse role stuck on client feedback.',
    'clients', 'item-millbrook')
    + risk_li('4 CVs from the week-40 intake still unreviewed. 8 came in, 4 shortlisted.',
    'delivery', 'item-cvpack'))
focus = ('<ul class="space-y-1">'
    + tick_item('Approve the Kestrel Kitchens CV pack so it ships today.')
    + tick_item('Approve the INV-1041 overdue reminder.')
    + tick_item('Send the Millbrook chase, text is written.')
    + '</ul>')

def tstat_li(text, state_chip, goto=None, target=None):
    extra = f' data-goto="{goto}" data-target="{target}"' if goto else ''
    hover = 'cursor-pointer hover:bg-accent ' if goto else ''
    return (f'<li class="flex {hover}items-start gap-2.5 rounded-md px-2 py-1 -mx-2 text-sm transition-colors"{extra}>'
            f'{state_chip[0]}<span class="flex-1">{text}</span><span>{state_chip[1]}</span></li>')

tishka = ('<ul class="space-y-1.5">'
    + tstat_li('Write the INV-1041 overdue reminder.', (ICON_CHECK, f'<span class="{CHIP_OK}">done Fri 16:20</span>'), 'finance', 'item-inv-1041')
    + tstat_li('Assemble the week 40 report from board + ledger.', (ICON_CHECK, f'<span class="{CHIP_OK}">done Sat 08:00</span>'), 'reporting', 'item-week40')
    + tstat_li('Draft the Kestrel Kitchens check-in update.', (ICON_CHECK, f'<span class="{CHIP_OK}">done Fri 17:05</span>'), 'clients', 'item-kestrel')
    + tstat_li('Review the remaining 4 CVs against the role rules.', (ICON_ALERT, f'<span class="{CHIP_WARN}">doing now · 4 of 8 left</span>'))
    + tstat_li('Watch the Millbrook jobs sheet, chase if still quiet by 16:00.', (ICON_DOT, f'<span class="{CHIP_MID}">queued · tishka handles it</span>'))
    + tstat_li('Dig Edgbaston Clinics until something is checked, then draft.', (ICON_DOT, f'<span class="{CHIP_MID}">queued · tishka handles it</span>'))
    + '</ul><p class="mt-2 text-xs text-muted-foreground">Tishka stamps these done the moment the record shows the work happened. Nobody ticks for it.</p>')

standup_body = ('<div class="space-y-5">'
    + group('Wins since yesterday', wins)
    + group('Risks', risks)
    + group('Focus — tick as you go', focus)
    + group("Tishka's list today — it marks these done itself", tishka)
    + '</div>')
standup = card('Standup', 'wins · risks · focus · tishka&#39;s list', standup_body)

today_body = ('<ol class="relative space-y-3 border-l border-border pl-4">'
    + today_li('08:45–09:00', CHIP_OK, 'focus', 'Morning brief', '', 'Read the standup, confirm the three focus items.')
    + today_li('09:30–10:00', CHIP_CAT, 'client', 'Kestrel Kitchens check-in', 'with Sarah', 'Draft update ready in Clients.')
    + today_li('10:30–12:00', CHIP_OK, 'focus', 'Kestrel Kitchens CV pack, final review', '', 'Ships on approval.')
    + today_li('13:00–13:30', CHIP_WARN, 'sales', 'First touches, approve 2 drafts', 'with Sarah', 'Colmore Legal and Aston Care Group, drafted in Leads.')
    + today_li('14:00–14:30', CHIP_CAT, 'client', 'Millbrook Logistics call', 'site manager', 'Warehouse supervisor role.')
    + today_li('16:00–16:15', CHIP_BAD, 'finance', 'Approve INV-1041 reminder', '', '£1,850 overdue.')
    + '</ol>')
today = card('Today', '6 entries', today_body, right='<span class="label-mono">10:43</span>')

waiting_body = ('<ul class="divide-y divide-border">'
    + wait_li('Millbrook Logistics', 'Warehouse supervisor feedback missing for 3 days',
        f'<span class="{CHIP_BAD}">high</span>', 'waiting on the site manager (client) · since Wed',
        act_btn('Open chase', None, 'clients'))
    + wait_li('Belmont Staffing', 'Payment on INV-1041 not received',
        f'<span class="{CHIP_BAD}">high</span>', 'waiting on client accounts · since 24 Aug, 12d',
        act_btn('Approve reminder', None, 'finance'))
    + wait_li('Harborne Dental', 'Candidate choice for the offer pack',
        f'<span class="{CHIP_WARN}">medium</span>', 'waiting on the practice manager (client) · decision due Tue',
        act_btn('Open offer pack', None, 'delivery'))
    + '</ul>')
waiting = card('Waiting on someone else', '3 open', waiting_body, right=act_btn('All clients', None, 'clients'))

brief_view = ('<div id="view-brief">' + header + stats_row
    + '<div class="mt-6 grid gap-6 lg:grid-cols-2 items-start">' + standup + today + '</div>'
    + '<div class="mt-6">' + waiting + '</div></div>')

# ---------- other pages ----------
def pagehead(label, title, sub=''):
    s = f'<p class="mt-2 max-w-2xl text-sm text-muted-foreground">{sub}</p>' if sub else ''
    return (f'<header class="border-b border-border pb-6 mb-6"><div class="label-mono">{label}</div>'
            f'<h1 class="mt-2 text-3xl md:text-[2.2rem] leading-[1.1]">{title}</h1>{s}</header>')

def stats3(items):
    return ('<div class="grid grid-cols-1 divide-y divide-border rounded-lg border border-border bg-card md:grid-cols-3 md:divide-y-0">'
            + ''.join(stat(*i) for i in items) + '</div>')

def table_card(title, label, headers, rows, note=''):
    th = ''.join(f'<th class="py-2 pr-3 text-left font-mono text-[0.65rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">{h}</th>' for h in headers)
    body = (f'<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-border">{th}</tr></thead>'
            f'<tbody class="divide-y divide-border">{rows}</tbody></table></div>'
            + (f'<p class="mt-3 text-xs text-muted-foreground">{note}</p>' if note else ''))
    return card(title, label, body)

TD = 'py-2.5 pr-3 align-top'

clients_rows = (
    f'<tr id="item-kestrel"><td class="{TD}"><div class="font-medium">Kestrel Kitchens</div><div class="text-xs text-muted-foreground">Weekly recruitment support</div><div class="label-mono mt-1">Ledger Fri 17:05</div></td>'
    f'<td class="{TD}">Weekly client</td><td class="{TD}"><span class="{CHIP_OK}">good</span></td>'
    f'<td class="{TD}">CV pack ships today, check-in Monday. Draft update written.</td><td class="{TD} num text-xs text-muted-foreground">today</td>'
    f'<td class="{TD}">{act_btn("Approve pack", "Sarah", "delivery", primary=True)}</td></tr>'
    f'<tr><td class="{TD}"><div class="font-medium">Harborne Dental</div><div class="text-xs text-muted-foreground">Receptionist role, live</div><div class="label-mono mt-1">Ledger Fri 15:40</div></td>'
    f'<td class="{TD}">Active role</td><td class="{TD}"><span class="{CHIP_OK}">good</span></td>'
    f'<td class="{TD}">2 interviews Tue 10:00, room booked. Offer pack if they choose.</td><td class="{TD} num text-xs text-muted-foreground">Tue</td>'
    f'<td class="{TD}">{act_btn("Open reminders", "Sarah", "delivery")}</td></tr>'
    f'<tr id="item-millbrook"><td class="{TD}"><div class="font-medium">Millbrook Logistics</div><div class="text-xs text-muted-foreground">Warehouse supervisor role</div><div class="label-mono mt-1">Ledger Wed 11:15</div></td>'
    f'<td class="{TD}">Active role</td><td class="{TD}"><span class="{CHIP_WARN}">blocked 3 days</span></td>'
    f'<td class="{TD}">Waits on client feedback since Wednesday. Chase is written.</td><td class="{TD} num text-xs text-muted-foreground">3d waiting</td>'
    f'<td class="{TD}">{act_btn("Send chase", "Pete", "clients", primary=True)}</td></tr>')
clients_view = ('<div id="view-clients" class="hidden">'
    + pagehead('Clients · stage, health, next step, approval', 'Who is where, what ships, what is stuck.',
        'One row per engagement. Nothing sends until the person named approves it; the name just says whose call it is.')
    + stats3([('Active clients', '3', '2 ship this week'), ('Blocked', '1', 'waiting on client feedback'), ('Monthly value', '£3,600', 'from the ledger')])
    + '<div class="mt-6">' + table_card('Engagements', '3 clients', ['Client','Stage','Health','Next step','When','Approval'], clients_rows) + '</div></div>')

def lead_card(name, fit_chip, src, why, draft, btns):
    d = (f'<div class="mt-1 rounded-md border border-dashed border-border bg-secondary px-3 py-2 text-sm">{draft}</div>') if draft else ''
    return (f'<div class="{CARD}"><div class="p-4">'
            f'<div class="flex flex-wrap items-center gap-2"><span class="text-sm font-medium">{name}</span>{fit_chip}<span class="label-mono">{src}</span></div>'
            f'<div class="label-mono mt-3 mb-1">Why now</div><p class="text-sm">{why}</p>'
            + (f'<div class="label-mono mt-3 mb-1">First touch · draft</div>{d}' if draft else '')
            + f'<div class="mt-3 flex flex-wrap items-center gap-2">{btns}</div></div></div>')

leads_view = ('<div id="view-leads" class="hidden">'
    + pagehead('Leads · researched companies · first-touch drafts', 'Researched, drafted, and going nowhere without you.',
        'Nothing sends from this lane. Approving moves the draft to Clients as a pending intro.')
    + '<div class="mt-6">' + stats3([('Checked this week','3','research stamped on each'),('Drafts ready','2','wait for approval'),('Sent from here','0','this lane cannot send')]) + '</div>'
    + '<div class="mt-6 space-y-4">'
    + lead_card('Colmore Legal', f'<span class="{CHIP_OK}">checked</span> <span class="{CHIP_MID}">6 roles in 2 weeks</span>', 'Research Fri 12:10',
        'Hiring spike: 6 roles posted in 2 weeks, two of them live for 3 weeks with no new applicants.',
        'Hi Priya, noticed Colmore has six roles open, and your conveyancing role has been up three weeks. We filled the same shape of role for a Birmingham practice in nine days. Worth a 15-minute call?',
        act_btn('Approve first touch', None, None, primary=True) + act_btn('Park') + act_btn('Copy') + act_btn('Ask about this', None, None, ctx='Leads · Colmore Legal draft'))
    + lead_card('Aston Care Group', f'<span class="{CHIP_OK}">checked</span> <span class="{CHIP_MID}">gap found</span>', 'Research Fri 12:10',
        'No weekend reception cover process anywhere on their site. The draft opens with that gap.',
        'Hi Marcus, quick one. Your weekend cover currently runs on a phone tree. We built a rota for a care group your size that cut missed shifts to near zero. Open to seeing it?',
        act_btn('Approve first touch', None, None, primary=True) + act_btn('Park') + act_btn('Copy'))
    + lead_card('Edgbaston Clinics', f'<span class="{CHIP_WARN}">guess, do not quote</span>', 'Research Fri 12:10',
        'Probably growing, site hints only. No draft until there is something checked.', '',
        act_btn('Dig deeper') + act_btn('Ask about this', None, None, ctx='Leads · Edgbaston Clinics'))
    + '</div></div>')

delivery_view = ('<div id="view-delivery" class="hidden">'
    + pagehead('Delivery · the actual work product', 'Every deliverable in flight, its stage, its owner and when it is due.',
        'Move a card when it moves in reality.')
    + '<div class="mt-6 grid gap-4 md:grid-cols-3">'
    + card('Waiting for approval', '2',
        '<div class="space-y-3">'
        + f'<div id="item-cvpack" class="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm"><div class="font-medium">Kestrel Kitchens CV pack</div><div class="text-xs text-muted-foreground">4 CVs · ships today</div><div class="mt-2">{act_btn("Approve and ship", "Sarah", None, primary=True)}</div></div>'
        + f'<div class="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm"><div class="font-medium">Harborne interview reminders</div><div class="text-xs text-muted-foreground">Tue 10:00 · 2 candidates</div><div class="mt-2">{act_btn("Approve and send", "Sarah", None, primary=True)}</div></div></div>')
    + card('In progress', '1',
        f'<div class="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm"><div class="font-medium">CV review queue</div><div class="text-xs text-muted-foreground">8 in from this week&#39;s intake · 4 shortlisted so far</div><div class="mt-1 text-xs text-muted-foreground">Read from Files, results attach to each role.</div></div>')
    + card('Done', '1',
        f'<div class="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm"><div class="font-medium">Harborne shortlist of 2</div><div class="text-xs text-muted-foreground">sent Fri 15:40 · interviews set Tuesday</div><div class="label-mono mt-1">Ledger Fri 15:40</div></div>')
    + '</div></div>')

rep_card = card('Week 40 report · Kestrel Kitchens', 'draft for review',
    '<p class="text-sm">Twelve CVs came in, four made the shortlist, two offers are at stage. The pipeline is moving faster than week 39.</p>'
    + '<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">'
    + stat('CVs in', '12', 'board export · W40') + stat('Shortlisted', '4', 'Delivery lane · Fri 17:05') + stat('Offers at stage', '2', 'ledger · Fri 15:40')
    + '</div>'
    + '<div class="mt-3 flex flex-wrap items-center gap-2">' + act_btn('Approve report', None, None, primary=True) + act_btn('Edit first') + act_btn('Ask about this', None, None, ctx='Reporting · Week 40 draft') + '</div>'
    + '<p class="mt-2 text-xs text-muted-foreground">Nothing leaves this lane until it is approved. The client never sees a draft.</p>',
    right='<span class="label-mono">prepared Sat 08:00</span>')
rep_card = rep_card.replace('<section class="' + CARD, '<section id="item-week40" class="' + CARD, 1)
reporting_view = ('<div id="view-reporting" class="hidden">'
    + pagehead('Reporting · drafted for review · approval: sarah', 'Numbers pulled for you, drafted for review.',
        'Each report is assembled from the platform it came from, with a plain-language headline. You approve before a client ever sees it.')
    + '<div class="mt-6">' + rep_card + '</div></div>')

finance_rows = (
    f'<tr id="item-inv-1041"><td class="{TD}">INV-1041<div class="text-xs text-muted-foreground">issued 24 Aug</div></td>'
    f'<td class="{TD}"><div class="font-medium">Belmont Staffing</div><div class="label-mono mt-1">Ledger Fri 16:20</div></td>'
    f'<td class="{TD} num font-medium">£1,850</td><td class="{TD}">Overdue 12 days. Reminder written.</td>'
    f'<td class="{TD}">{act_btn("Approve and send reminder", "Pete", None, primary=True)}</td></tr>'
    f'<tr><td class="{TD}">INV-1040<div class="text-xs text-muted-foreground">paid Thu</div></td>'
    f'<td class="{TD}"><div class="font-medium">Kestrel Kitchens</div><div class="label-mono mt-1">Ledger Thu 14:22</div></td>'
    f'<td class="{TD} num font-medium">£1,150</td><td class="{TD}"><span class="{CHIP_OK}">paid</span> 5 days to pay.</td>'
    f'<td class="{TD} num text-xs text-muted-foreground">—</td></tr>'
    f'<tr><td class="{TD}">INV-1039<div class="text-xs text-muted-foreground">paid Tue</div></td>'
    f'<td class="{TD}"><div class="font-medium">Harborne Dental</div><div class="label-mono mt-1">Ledger Tue 10:02</div></td>'
    f'<td class="{TD} num font-medium">£1,200</td><td class="{TD}"><span class="{CHIP_OK}">paid</span> 9 days to pay.</td>'
    f'<td class="{TD} num text-xs text-muted-foreground">—</td></tr>'
    f'<tr><td class="{TD}">October retainers<div class="text-xs text-muted-foreground">draft on the 1st</div></td>'
    f'<td class="{TD}"><div class="font-medium">All clients</div><div class="label-mono mt-1">rules/pricing.md</div></td>'
    f'<td class="{TD} num font-medium">£3,600</td><td class="{TD}">Drafts appear on 1 Oct, wait for approval.</td>'
    f'<td class="{TD} num text-xs text-muted-foreground">—</td></tr>')
money_card = card('Weekly money summary', 'drafted for review · under 10 lines',
    '<div class="text-sm">£4,200 invoiced this month. £2,350 collected. £1,850 overdue, reminder ready to approve.</div>'
    + '<div class="label-mono mt-1">Ledger + bank feed · Sat 08:00</div>')
finance_view = ('<div id="view-finance" class="hidden">'
    + pagehead('Finance · drafts never leave until approved', 'Drafted invoices, and the weekly money picture.',
        'What is waiting to be issued, what is out, what has landed and what is late. Marking an invoice issued records your decision here; it does not send anything.')
    + '<div class="mt-6">' + stats3([('Issued, September','£4,200','3 invoices · ledger'),('Paid','£2,350','2 invoices · bank feed'),('Overdue','£1,850','12 days · Belmont Staffing')]) + '</div>'
    + '<div class="mt-6">' + table_card('Invoices', 'this and last month', ['Invoice','Client','Amount','Status','Action'], finance_rows) + '</div>'
    + '<div class="mt-6">' + money_card + '</div></div>')

file_rows = (
    f'<tr><td class="{TD}"><div class="font-medium">CV intake week 40.xlsx</div><div class="text-xs text-muted-foreground">Fri 09:30 · from the job board</div><div class="label-mono mt-1">Files</div></td>'
    f'<td class="{TD}">8 CVs read, 4 shortlisted against the Harborne and Kestrel roles.</td>'
    f'<td class="{TD}">{act_btn("Open in Delivery", None, "delivery")}</td></tr>'
    f'<tr><td class="{TD}"><div class="font-medium">Millbrook jobs sheet.xlsx</div><div class="text-xs text-muted-foreground">Tue 18:00 · last copy received</div><div class="label-mono mt-1">Files</div></td>'
    f'<td class="{TD}">Nothing new since Thursday. Flagged as a risk in this morning&#39;s standup.</td>'
    f'<td class="{TD}">{act_btn("Open chase in Clients", None, "clients")}</td></tr>'
    f'<tr><td class="{TD}"><div class="font-medium">Kestrel check-in brief.pdf</div><div class="text-xs text-muted-foreground">Thu 11:00 · from Sarah</div><div class="label-mono mt-1">Files</div></td>'
    f'<td class="{TD}">Read, key points pulled, check-in update drafted for Monday.</td>'
    f'<td class="{TD}">{act_btn("Open draft in Clients", None, "clients")}</td></tr>'
    f'<tr><td class="{TD}"><div class="font-medium">Harborne offer pack template.docx</div><div class="text-xs text-muted-foreground">Wed 14:20 · from Sarah</div><div class="label-mono mt-1">Files</div></td>'
    f'<td class="{TD}">Waiting. Used only if Harborne choose a candidate on Tuesday.</td>'
    f'<td class="{TD}">{act_btn("Open in Delivery", None, "delivery")}</td></tr>'
    f'<tr><td class="{TD}"><div class="font-medium">INV-1041 reminder.pdf</div><div class="text-xs text-muted-foreground">Fri 16:20 · generated here</div><div class="label-mono mt-1">Ledger Fri 16:20</div></td>'
    f'<td class="{TD}">Written from the ledger.</td>'
    f'<td class="{TD}">{act_btn("Approve in Finance", None, "finance")}</td></tr>')
recent_card = table_card('Recent files', 'what arrived · what happened · where the result landed',
    ['File', 'What happened', 'Result'], file_rows,
    'The originals never change. Every result keeps its link back to the file it came from, so any figure can be traced.')
files_view = ('<div id="view-files" class="hidden">'
    + pagehead('Files · originals kept exactly as they arrived', 'Drop them here.',
        'The agent reads them, keeps the original untouched, and puts the result where it belongs.')
    + '<div class="mt-6 rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center">'
      '<div class="display text-lg">Drop files here</div>'
      '<div class="mt-1 text-xs text-muted-foreground">CVs, job sheets, briefs, invoices, anything.</div></div>'
    + '<div class="mt-6">' + stats3([('In this week','5','3 read · 2 waiting'),('Results filed','3','each linked to its lane'),('Originals kept','5','never rewritten, ever')]) + '</div>'
    + '<div class="mt-6">' + recent_card + '</div></div>')

usermodal = ('<div class="modal-backdrop" id="usermodal"><div class="modal">'
    '<div class="flex items-center gap-3"><span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">P</span>'
    '<div class="min-w-0"><div class="text-sm font-medium">Pete</div><div class="text-xs text-muted-foreground truncate">pete@belmontrecruitment.co.uk</div></div></div>'
    '<div class="label-mono mt-4 mb-1.5">Theme</div>'
    '<div class="flex gap-2">'
    '<button type="button" id="theme-dark" class="' + BTN_OUTLINE + '">Dark</button>'
    '<button type="button" id="theme-light" class="' + BTN_OUTLINE + '">Light</button>'
    '</div>'
    '<div class="mt-4 border-t border-border pt-3">'
    '<button type="button" class="' + BTN_OUTLINE + '" title="Demo only">Sign out</button>'
    '</div></div></div>')

chat = ('<aside class="chatpanel" id="chatpanel"><div class="cp-head">'
    '<div class="t"><span class="dot"></span>Tishka</div>'
    '<div class="mt-2"><span class="' + CHIP_MID + '" id="ctxlabel">On: morning brief · saturday</span></div></div>'
    '<div class="cp-body" id="cpbody">'
    '<div class="msg ai">Morning brief read, Pete. Two approvals are waiting today: the CV pack in Delivery, the overdue reminder in Finance.'
    '<span class="msrc">From this morning&#39;s standup, 8:03</span></div></div>'
    '<div class="cp-input"><input id="cpin" type="text" placeholder="Ask about what&#39;s on screen" /><button id="cpsend">Send</button></div></aside>')

script = open('new-script.js').read()

FOOT_LINK = ('<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&amp;'
             'family=Inter:wght@400;500;600&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap" rel="stylesheet">')
THEME_INIT = ('<script>(function(){try{var p=new URLSearchParams(location.search).get("theme");'
              'if(p==="dark")localStorage.setItem("tishka-theme","dark");'
              'if(localStorage.getItem("tishka-theme")==="dark")document.documentElement.classList.add("dark");}catch(e){}})();</script>')

closes = '</div></main></main>'
html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        '<title>Tishka · Belmont Recruitment</title>\n'
        + THEME_INIT + '\n' + FOOT_LINK + '\n<style>\n' + css + '\n</style>\n<style>' + OVERRIDE + '</style>\n'
        '</head>\n<body>\n' + shell
        + '<button type="button" id="chatbtn" class="' + BTN_OUTLINE + '" style="position:absolute; top:14px; right:20px; z-index:40;">Ask Tishka</button>'
        + '<div class="mx-auto max-w-6xl">' + brief_view + clients_view + leads_view
        + delivery_view + reporting_view + finance_view + files_view + '</div>'
        + closes + usermodal + chat + '</div>' + script + '\n</body>\n</html>')

OUT.write_text(html)
print('written', OUT, len(html), 'bytes')