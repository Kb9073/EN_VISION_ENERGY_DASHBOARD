import re

path = r'components/tabs/CarbonTab.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    # Tooltip contentStyle — background
    ('backgroundColor: "#0F172A",', 'backgroundColor: "#0a0a0a",'),
    # Tooltip contentStyle — border
    ('border: "1px solid #334155",', 'border: "1px solid rgba(255,255,255,0.12)",'),
    # Axis tick colors
    ('tick={{ fill: "#94A3B8", fontSize: 12 }}', 'tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 12 }}'),
    # CartesianGrid stroke
    ('stroke="#334155"', 'stroke="rgba(255,255,255,0.06)"'),
    # Legend wrapperStyle
    ('wrapperStyle={{ color: "#CBD5E1", fontSize: "12px" }}', 'wrapperStyle={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}'),
    ('wrapperStyle={{ color: "#CBD5E1", fontSize: "11px" }}', 'wrapperStyle={{ color: "rgba(255,255,255,0.45)", fontSize: "11px" }}'),
    # RadialBar background
    ('background={{ fill: "#1E293B" }}', 'background={{ fill: "rgba(255,255,255,0.04)" }}'),
    # Text classes
    ('text-slate-200', 'text-white/80'),
    ('text-slate-400', 'text-white/40'),
    ('text-slate-500', 'text-white/30'),
    # Progress bar backgrounds
    ('bg-slate-700', 'bg-white/8'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print('CarbonTab.tsx updated successfully')
