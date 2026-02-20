"""
jar2dts.py — Generate TypeScript .d.ts type definitions from a Java JAR file.
"""

# This converter was created by Claude

import struct
import zipfile
import sys
import os
import re
import argparse
from dataclasses import dataclass, field
from typing import Iterator, Optional

# ─── Java class file constants ──────────────────────────────────────────────

CONSTANT_Utf8               = 1
CONSTANT_Integer            = 3
CONSTANT_Float              = 4
CONSTANT_Long               = 5
CONSTANT_Double             = 6
CONSTANT_Class              = 7
CONSTANT_String             = 8
CONSTANT_Fieldref           = 9
CONSTANT_Methodref          = 10
CONSTANT_InterfaceMethodref = 11
CONSTANT_NameAndType        = 12
CONSTANT_MethodHandle       = 15
CONSTANT_MethodType         = 16
CONSTANT_InvokeDynamic      = 18
CONSTANT_Module             = 19
CONSTANT_Package            = 20

ACC_PUBLIC    = 0x0001
ACC_PRIVATE   = 0x0002
ACC_PROTECTED = 0x0004
ACC_STATIC    = 0x0008
ACC_FINAL     = 0x0010
ACC_INTERFACE = 0x0200
ACC_ABSTRACT  = 0x0400
ACC_ENUM      = 0x4000

# ─── Dataclasses ─────────────────────────────────────────────────────────────

@dataclass
class JavaField:
    name: str
    descriptor: str
    access: int
    signature: Optional[str] = None  # generic signature if present

@dataclass
class JavaMethod:
    name: str
    descriptor: str
    access: int
    signature: Optional[str] = None

@dataclass
class JavaClass:
    class_name: str           # e.g. com/example/Foo
    super_name: Optional[str]
    interfaces: list[str]
    access: int
    fields: list[JavaField]
    methods: list[JavaMethod]
    signature: Optional[str] = None  # generic class signature


# ─── Class file parser ───────────────────────────────────────────────────────

class ClassParser:
    def __init__(self, data: bytes):
        self.data = data
        self.pos = 0

    def read(self, fmt: str):
        size = struct.calcsize(fmt)
        vals = struct.unpack_from('>' + fmt, self.data, self.pos)
        self.pos += size
        return vals if len(vals) > 1 else vals[0]

    def read_bytes(self, n: int) -> bytes:
        b = self.data[self.pos:self.pos + n]
        self.pos += n
        return b

    def parse(self) -> Optional[JavaClass]:
        magic = self.read('I')
        if magic != 0xCAFEBABE:
            return None
        minor = self.read('H')
        major = self.read('H')

        # Constant pool
        cp_count = self.read('H')
        cp = [None] * cp_count  # 1-indexed
        i = 1
        while i < cp_count:
            tag = self.read('B')
            if tag == CONSTANT_Utf8:
                length = self.read('H')
                cp[i] = ('Utf8', self.read_bytes(length).decode('utf-8', errors='replace'))
            elif tag == CONSTANT_Class:
                cp[i] = ('Class', self.read('H'))
            elif tag == CONSTANT_String:
                cp[i] = ('String', self.read('H'))
            elif tag in (CONSTANT_Fieldref, CONSTANT_Methodref, CONSTANT_InterfaceMethodref):
                cp[i] = (tag, self.read('H'), self.read('H'))
            elif tag == CONSTANT_NameAndType:
                cp[i] = ('NameAndType', self.read('H'), self.read('H'))
            elif tag == CONSTANT_Integer:
                cp[i] = ('Integer', self.read('i'))
            elif tag == CONSTANT_Float:
                cp[i] = ('Float', self.read('f'))
            elif tag == CONSTANT_Long:
                hi, lo = self.read('I'), self.read('I')
                cp[i] = ('Long', (hi << 32) | lo)
                i += 1  # longs/doubles take two slots
                cp[i] = None
            elif tag == CONSTANT_Double:
                cp[i] = ('Double', self.read('d'))
                i += 1
                cp[i] = None
            elif tag == CONSTANT_MethodHandle:
                cp[i] = ('MethodHandle', self.read('B'), self.read('H'))
            elif tag == CONSTANT_MethodType:
                cp[i] = ('MethodType', self.read('H'))
            elif tag == CONSTANT_InvokeDynamic:
                cp[i] = ('InvokeDynamic', self.read('H'), self.read('H'))
            elif tag in (CONSTANT_Module, CONSTANT_Package):
                cp[i] = ('ModPkg', self.read('H'))
            else:
                return None  # Unknown tag, bail
            i += 1

        def utf8(idx):
            if idx is None or idx == 0: return None
            entry = cp[idx]
            if entry and entry[0] == 'Utf8':
                return entry[1]
            return None

        def class_name(idx):
            if idx == 0: return None
            entry = cp[idx]
            if entry and entry[0] == 'Class':
                return utf8(entry[1])
            return None

        access = self.read('H')
        this_class = class_name(self.read('H'))
        super_idx = self.read('H')
        super_class = class_name(super_idx) if super_idx != 0 else None

        iface_count = self.read('H')
        interfaces = [class_name(self.read('H')) for _ in range(iface_count)]

        # Fields
        fields = []
        field_count = self.read('H')
        for _ in range(field_count):
            f_access = self.read('H')
            f_name = utf8(self.read('H'))
            f_desc = utf8(self.read('H'))
            f_sig = None
            attr_count = self.read('H')
            for _ in range(attr_count):
                attr_name = utf8(self.read('H'))
                attr_len = self.read('I')
                attr_data = self.read_bytes(attr_len)
                if attr_name == 'Signature':
                    sig_idx = struct.unpack('>H', attr_data)[0]
                    f_sig = utf8(sig_idx)
            fields.append(JavaField(f_name, f_desc, f_access, f_sig))

        # Methods
        methods = []
        method_count = self.read('H')
        for _ in range(method_count):
            m_access = self.read('H')
            m_name = utf8(self.read('H'))
            m_desc = utf8(self.read('H'))
            m_sig = None
            attr_count = self.read('H')
            for _ in range(attr_count):
                attr_name = utf8(self.read('H'))
                attr_len = self.read('I')
                attr_data = self.read_bytes(attr_len)
                if attr_name == 'Signature':
                    sig_idx = struct.unpack('>H', attr_data)[0]
                    m_sig = utf8(sig_idx)
            methods.append(JavaMethod(m_name, m_desc, m_access, m_sig))

        # Class-level attributes (look for Signature)
        class_sig = None
        attr_count = self.read('H')
        for _ in range(attr_count):
            attr_name = utf8(self.read('H'))
            attr_len = self.read('I')
            attr_data = self.read_bytes(attr_len)
            if attr_name == 'Signature':
                sig_idx = struct.unpack('>H', attr_data)[0]
                class_sig = utf8(sig_idx)

        return JavaClass(this_class, super_class, interfaces, access, fields, methods, class_sig)


# ─── Type descriptor → TypeScript ────────────────────────────────────────────

PRIMITIVE_MAP = {
    'B': 'number',   # byte
    'C': 'string',   # char
    'D': 'number',   # double
    'F': 'number',   # float
    'I': 'number',   # int
    'J': 'number',   # long (BigInt could be used too)
    'S': 'number',   # short
    'Z': 'boolean',  # boolean
    'V': 'void',
}

KNOWN_TYPES = {
    'java/lang/String': 'string',
    'java/lang/CharSequence': 'string',
    'java/lang/StringBuilder': 'string',
    'java/lang/StringBuffer': 'string',
    'java/lang/Number': 'number',
    'java/lang/Integer': 'number',
    'java/lang/Long': 'number',
    'java/lang/Double': 'number',
    'java/lang/Float': 'number',
    'java/lang/Short': 'number',
    'java/lang/Byte': 'number',
    'java/lang/Boolean': 'boolean',
    'java/lang/Character': 'string',
    'java/lang/Object': 'any',
    'java/lang/Void': 'void',
    'java/util/List': 'Array',
    'java/util/ArrayList': 'Array',
    'java/util/Collection': 'Array',
    'java/util/Set': 'Set',
    'java/util/Map': 'Map',
    'java/util/HashMap': 'Map',
    'java/util/LinkedHashMap': 'Map',
    'java/util/Optional': 'Optional',
    'java/util/function/Function': 'Function',
    'java/util/function/Consumer': 'Function',
    'java/util/function/Supplier': 'Function',
    'java/util/function/Predicate': 'Function',
}

def build_type_name_map(classes: list[JavaClass]) -> dict[str, str]:
    """Build a stable map from JVM class path to unique TypeScript type names."""
    by_base: dict[str, list[str]] = {}
    for jc in classes:
        class_path = jc.class_name
        base_name = sanitize_name(class_path.split('/')[-1].replace('$', '_'))
        by_base.setdefault(base_name, []).append(class_path)

    used: set[str] = set()
    mapping: dict[str, str] = {}

    for base_name, class_paths in sorted(by_base.items(), key=lambda item: item[0]):
        sorted_paths = sorted(class_paths)
        if len(sorted_paths) == 1 and base_name not in used:
            mapping[sorted_paths[0]] = base_name
            used.add(base_name)
            continue

        for class_path in sorted_paths:
            pkg_parts = [sanitize_name(p) for p in class_path.split('/')[:-1] if p]
            chosen = None
            for depth in range(1, len(pkg_parts) + 1):
                suffix = '_'.join(pkg_parts[-depth:])
                candidate = f"{base_name}_{suffix}"
                if candidate not in used:
                    chosen = candidate
                    break

            if chosen is None:
                idx = 2
                candidate = f"{base_name}_2"
                while candidate in used:
                    idx += 1
                    candidate = f"{base_name}_{idx}"
                chosen = candidate

            mapping[class_path] = chosen
            used.add(chosen)

    return mapping

def java_class_to_ts(class_path: str, type_names: Optional[dict[str, str]] = None) -> str:
    """Convert a JVM class path to a TypeScript type name."""
    if class_path in KNOWN_TYPES:
        return KNOWN_TYPES[class_path]
    if type_names and class_path in type_names:
        return type_names[class_path]
    parts = class_path.split('/')
    return sanitize_name(parts[-1].replace('$', '_'))

def parse_descriptor(desc: str, type_names: Optional[dict[str, str]] = None) -> tuple[list[str], str]:
    """Parse a JVM method descriptor into (param_types, return_type)."""
    if '(' not in desc:
        return [], desc_to_ts(desc, type_names)
    params_raw, ret_raw = desc[1:].split(')', 1)
    params = list(parse_type_sequence(params_raw, type_names))
    ret = desc_to_ts(ret_raw, type_names)
    return params, ret

def parse_type_sequence(s: str, type_names: Optional[dict[str, str]] = None) -> Iterator[str]:
    """Parse a sequence of JVM type descriptors."""
    i = 0
    while i < len(s):
        c = s[i]
        if c in PRIMITIVE_MAP:
            yield PRIMITIVE_MAP[c]
            i += 1
        elif c == 'L':
            end = s.index(';', i)
            class_path = s[i+1:end]
            yield java_class_to_ts(class_path, type_names)
            i = end + 1
        elif c == '[':
            # Array: find the element type
            j = i + 1
            while j < len(s) and s[j] == '[':
                j += 1
            # Now parse element
            elem_desc = s[j]
            if elem_desc == 'L':
                end = s.index(';', j)
                class_path = s[j+1:end]
                elem_ts = java_class_to_ts(class_path, type_names)
                i = end + 1
            else:
                elem_ts = PRIMITIVE_MAP.get(elem_desc, 'any')
                i = j + 1
            dimensions = j - i + 1 if j > i else 1  # recalculate
            dimensions = (j - (i - (j - i + 1)))  # count brackets
            # Simpler: count brackets
            brackets = j - (i - (j - i + 1))
            yield f"{elem_ts}[]"
        else:
            yield 'any'
            i += 1

def desc_to_ts(desc: str, type_names: Optional[dict[str, str]] = None) -> str:
    """Convert a single JVM type descriptor to TypeScript."""
    if not desc:
        return 'any'
    c = desc[0]
    if c in PRIMITIVE_MAP:
        return PRIMITIVE_MAP[c]
    if c == 'L':
        class_path = desc[1:].rstrip(';')
        return java_class_to_ts(class_path, type_names)
    if c == '[':
        inner = desc_to_ts(desc[1:], type_names)
        return f"{inner}[]"
    return 'any'

def signature_to_ts(sig: str, type_names: Optional[dict[str, str]] = None) -> str:
    """
    Convert a JVM generic signature to TypeScript generics.
    Handles common cases like Ljava/util/List<Ljava/lang/String;>;
    """
    try:
        return _parse_sig(sig, type_names)
    except Exception:
        return 'any'

def _parse_sig(sig: str, type_names: Optional[dict[str, str]] = None) -> str:
    result, pos = _parse_type_sig(sig, 0, type_names)
    return result

def _parse_type_sig(sig: str, pos: int, type_names: Optional[dict[str, str]] = None) -> tuple[str, int]:
    if pos >= len(sig):
        return 'any', pos
    c = sig[pos]
    if c in PRIMITIVE_MAP:
        return PRIMITIVE_MAP[c], pos + 1
    if c == 'L':
        # Find the class name (up to '<' or ';')
        i = pos + 1
        class_end = i
        while class_end < len(sig) and sig[class_end] not in '<;':
            class_end += 1
        class_path = sig[i:class_end]
        ts_name = java_class_to_ts(class_path, type_names)
        if class_end < len(sig) and sig[class_end] == '<':
            # Generic args
            type_args = []
            p = class_end + 1
            while p < len(sig) and sig[p] != '>':
                if sig[p] == '*':  # wildcard
                    type_args.append('any')
                    p += 1
                elif sig[p] in '+-':  # bounded wildcard
                    p += 1
                    arg, p = _parse_type_sig(sig, p, type_names)
                    type_args.append(arg)
                else:
                    arg, p = _parse_type_sig(sig, p, type_names)
                    type_args.append(arg)
            ts_name = f"{ts_name}<{', '.join(type_args)}>"
            p += 1  # skip '>'
            # skip ';'
            if p < len(sig) and sig[p] == ';':
                p += 1
            return ts_name, p
        else:
            # skip ';'
            p = class_end + 1
            return ts_name, p
    if c == '[':
        inner, p = _parse_type_sig(sig, pos + 1, type_names)
        return f"{inner}[]", p
    if c == 'T':
        # Type variable
        end = sig.index(';', pos + 1)
        return sig[pos+1:end], end + 1
    if c in '+-':
        return _parse_type_sig(sig, pos + 1, type_names)
    if c == '*':
        return 'any', pos + 1
    return 'any', pos + 1


# ─── TypeScript emitter ───────────────────────────────────────────────────────

def is_public(access: int) -> bool:
    return bool(access & ACC_PUBLIC)

def is_protected(access: int) -> bool:
    return bool(access & ACC_PROTECTED)

def is_static(access: int) -> bool:
    return bool(access & ACC_STATIC)

def is_interface(access: int) -> bool:
    return bool(access & ACC_INTERFACE)

def is_enum(access: int) -> bool:
    return bool(access & ACC_ENUM)

def is_abstract(access: int) -> bool:
    return bool(access & ACC_ABSTRACT)

def sanitize_name(name: str) -> str:
    """Make a Java identifier safe for TypeScript."""
    if not name:
        return '_'

    # Replace characters that cannot appear in TS identifiers
    sanitized = re.sub(r'[^A-Za-z0-9_$]', '_', name)
    if not sanitized:
        sanitized = '_'

    # Identifiers cannot start with a digit
    if sanitized[0].isdigit():
        sanitized = '_' + sanitized

    # TypeScript reserved words
    reserved = {'class', 'delete', 'export', 'import', 'new', 'return',
                'typeof', 'var', 'let', 'const', 'in', 'instanceof',
                'switch', 'case', 'default', 'break', 'continue', 'for',
                'while', 'do', 'if', 'else', 'try', 'catch', 'finally',
                'throw', 'void', 'boolean', 'string', 'number', 'any',
                'null', 'undefined', 'true', 'false', 'type', 'interface',
                'package', 'implements', 'private', 'protected', 'public',
                'static', 'yield', 'await', 'enum', 'constructor'}
    if sanitized in reserved:
        return sanitized + '_'

    return sanitized

def fqcn_from_class_path(class_path: str) -> str:
    return class_path.replace('/', '.')

def extract_class_generics(sig: str) -> str:
    """Extract the class-level generic params from a class signature, e.g. <T:Ljava/lang/Object;>"""
    if not sig or not sig.startswith('<'):
        return ''
    depth = 0
    for i, c in enumerate(sig):
        if c == '<': depth += 1
        elif c == '>':
            depth -= 1
            if depth == 0:
                params_raw = sig[1:i]
                # Parse type param names: "T:Ljava/lang/Object;" → "T"
                params = []
                j = 0
                while j < len(params_raw):
                    colon = params_raw.find(':', j)
                    if colon == -1: break
                    param_name = params_raw[j:colon]
                    if param_name:
                        params.append(param_name)
                    # Skip to next param (find end of bound)
                    depth2 = 0
                    j = colon + 1
                    while j < len(params_raw):
                        if params_raw[j] == '<': depth2 += 1
                        elif params_raw[j] == '>': depth2 -= 1
                        elif params_raw[j] == ':' and depth2 == 0 and j > colon + 1:
                            # Could be next param's colon
                            # Look back for alpha chars without '<>'
                            break
                        j += 1
                return f"<{', '.join(params)}>" if params else ''
    return ''

def method_to_ts(method: JavaMethod, opts, type_names: Optional[dict[str, str]] = None) -> Optional[str]:
    name = method.name
    access = method.access

    # Skip non-public if requested
    if opts.public_only and not (is_public(access) or is_protected(access)):
        return None

    # Use generic signature if available
    sig = method.signature if (method.signature and not opts.no_generics) else None

    if name == '<init>':
        # Constructor
        try:
            if sig:
                params, _ = parse_method_sig_with_generics(sig, type_names)
            else:
                params, _ = parse_descriptor(method.descriptor, type_names)
        except Exception:
            params, _ = parse_descriptor(method.descriptor, type_names)
        param_strs = [f"arg{i}: {t}" for i, t in enumerate(params)]
        return f"  constructor({', '.join(param_strs)});"

    if name == '<clinit>':
        return None  # Static initializer, skip

    try:
        if sig:
            params, ret = parse_method_sig_with_generics(sig, type_names)
        else:
            params, ret = parse_descriptor(method.descriptor, type_names)
    except Exception:
        params, ret = parse_descriptor(method.descriptor, type_names)

    param_strs = [f"arg{i}: {t}" for i, t in enumerate(params)]
    static_kw = 'static ' if is_static(access) else ''
    safe_name = sanitize_name(name)
    return f"  {static_kw}{safe_name}({', '.join(param_strs)}): {ret};"

def parse_method_sig_with_generics(sig: str, type_names: Optional[dict[str, str]] = None) -> tuple[list[str], str]:
    """Parse a JVM generic method signature."""
    pos = 0
    # Optional type params e.g. <T:Ljava/lang/Object;>
    if sig.startswith('<'):
        depth = 0
        for i, c in enumerate(sig):
            if c == '<': depth += 1
            elif c == '>':
                depth -= 1
                if depth == 0:
                    pos = i + 1
                    break

    if pos >= len(sig) or sig[pos] != '(':
        return [], 'any'

    pos += 1  # skip '('
    params = []
    while pos < len(sig) and sig[pos] != ')':
        t, pos = _parse_type_sig(sig, pos, type_names)
        params.append(t)
    pos += 1  # skip ')'
    ret, _ = _parse_type_sig(sig, pos, type_names)
    return params, ret

def field_to_ts(f: JavaField, opts, type_names: Optional[dict[str, str]] = None) -> Optional[str]:
    access = f.access
    if opts.public_only and not (is_public(access) or is_protected(access)):
        return None
    sig = f.signature if (f.signature and not opts.no_generics) else None
    try:
        ts_type = signature_to_ts(sig, type_names) if sig else desc_to_ts(f.descriptor, type_names)
    except Exception:
        ts_type = desc_to_ts(f.descriptor, type_names)
    static_kw = 'static ' if is_static(access) else ''
    readonly_kw = 'readonly ' if (access & ACC_FINAL) else ''
    safe_name = sanitize_name(f.name)
    return f"  {static_kw}{readonly_kw}{safe_name}: {ts_type};"

def constructor_to_static_new_signature(method: JavaMethod, opts, class_name: str, type_names: Optional[dict[str, str]] = None) -> Optional[str]:
    """Convert a JVM constructor to a static-side TypeScript `new (...)` signature."""
    access = method.access
    if opts.public_only and not (is_public(access) or is_protected(access)):
        return None

    sig = method.signature if (method.signature and not opts.no_generics) else None
    try:
        if sig:
            params, _ = parse_method_sig_with_generics(sig, type_names)
        else:
            params, _ = parse_descriptor(method.descriptor, type_names)
    except Exception:
        params, _ = parse_descriptor(method.descriptor, type_names)

    param_strs = [f"arg{i}: {t}" for i, t in enumerate(params)]
    return f"  new({', '.join(param_strs)}): {class_name};"

def class_to_dts(jc: JavaClass, opts, all_classes: set[str], type_names: dict[str, str]) -> str:
    lines = []
    name = type_names.get(jc.class_name, sanitize_name(jc.class_name.split('/')[-1].replace('$', '_')))
    access = jc.access
    runtime_class_name = fqcn_from_class_path(jc.class_name)

    # Determine kind
    if is_enum(access):
        kind = 'enum'
    elif is_interface(access):
        kind = 'interface'
    else:
        kind = 'class'

    # Generic params
    generics = ''
    if jc.signature and not opts.no_generics:
        generics = extract_class_generics(jc.signature)

    # Extends / implements
    extends_clause = ''
    implements_clause = ''

    if kind != 'enum':
        if jc.super_name and jc.super_name not in ('java/lang/Object', 'java/lang/Enum'):
            super_ts = java_class_to_ts(jc.super_name, type_names)
            extends_clause = f" extends {super_ts}"

        ifaces = [java_class_to_ts(i, type_names) for i in jc.interfaces
                  if i not in ('java/io/Serializable', 'java/lang/Comparable', 'java/lang/Cloneable')]
        if ifaces:
            kw = 'extends' if kind == 'interface' else 'implements'
            implements_clause = f" {kw} {', '.join(ifaces)}"

    if kind == 'enum':
        enum_values = []
        for f in jc.fields:
            if is_static(f.access) and is_public(f.access):
                if f.descriptor == f'L{jc.class_name};':
                    enum_values.append(sanitize_name(f.name))

        if not opts.emit_runtime_value:
            if enum_values:
                lines.append(f"export enum {name} {{")
                lines.extend([f"  {v}," for v in enum_values])
                lines.append("}")
            else:
                lines.append(f"export type {name} = string;")
            return '\n'.join(lines)

        # Runtime-backed enum: instance type + static surface + Java.type binding
        iface_extends = [java_class_to_ts(i, type_names) for i in jc.interfaces
                         if i not in ('java/io/Serializable', 'java/lang/Comparable', 'java/lang/Cloneable')]
        iface_clause = f" extends {', '.join(iface_extends)}" if iface_extends else ''

        lines.append(f"export interface {name}{iface_clause} {{")
        for m in jc.methods:
            if is_static(m.access) or m.name in ('<init>', '<clinit>'):
                continue
            ts = method_to_ts(m, opts, type_names)
            if ts:
                lines.append(ts.replace('  static ', '  '))
        lines.append("}")
        lines.append("")

        lines.append(f"export interface {name}_Static {{")
        for ev in enum_values:
            lines.append(f"  readonly {ev}: {name};")

        seen_static = set()
        for m in jc.methods:
            if not is_static(m.access) or m.name in ('<init>', '<clinit>'):
                continue
            ts = method_to_ts(m, opts, type_names)
            if ts and ts not in seen_static:
                lines.append(ts.replace('  static ', '  '))
                seen_static.add(ts)
        lines.append("}")
        lines.append(f"export const {name}: {name}_Static = Java.type<{name}_Static>('{runtime_class_name}');")
        return '\n'.join(lines)

    if opts.emit_runtime_value and kind == 'class':
        parents: list[str] = []
        if jc.super_name and jc.super_name not in ('java/lang/Object',):
            parents.append(java_class_to_ts(jc.super_name, type_names))
        parents.extend([java_class_to_ts(i, type_names) for i in jc.interfaces
                        if i not in ('java/io/Serializable', 'java/lang/Comparable', 'java/lang/Cloneable')])
        extends_clause = f" extends {', '.join(parents)}" if parents else ''

        lines.append(f"export interface {name}{generics}{extends_clause} {{")

        for f in jc.fields:
            if f.name in ('$VALUES', 'serialVersionUID') or is_static(f.access):
                continue
            ts = field_to_ts(f, opts, type_names)
            if ts:
                lines.append(ts.replace('  static ', '  '))

        seen_instance = set()
        for m in jc.methods:
            if m.name in ('<init>', '<clinit>') or is_static(m.access):
                continue
            ts = method_to_ts(m, opts, type_names)
            if ts and ts not in seen_instance:
                lines.append(ts.replace('  static ', '  '))
                seen_instance.add(ts)

        lines.append("}")
        lines.append("")

        lines.append(f"export interface {name}_Static {{")

        seen_ctor = set()
        for m in jc.methods:
            if m.name != '<init>':
                continue
            ctor_sig = constructor_to_static_new_signature(m, opts, name, type_names)
            if ctor_sig and ctor_sig not in seen_ctor:
                lines.append(ctor_sig)
                seen_ctor.add(ctor_sig)

        for f in jc.fields:
            if f.name in ('$VALUES', 'serialVersionUID') or not is_static(f.access):
                continue
            ts = field_to_ts(f, opts, type_names)
            if ts:
                lines.append(ts.replace('  static ', '  '))

        seen_static_methods = set()
        for m in jc.methods:
            if m.name in ('<init>', '<clinit>') or not is_static(m.access):
                continue
            ts = method_to_ts(m, opts, type_names)
            if ts and ts not in seen_static_methods:
                lines.append(ts.replace('  static ', '  '))
                seen_static_methods.add(ts)

        lines.append("}")
        lines.append(f"export const {name}: {name}_Static = Java.type<{name}_Static>('{runtime_class_name}');")
        return '\n'.join(lines)

    # Abstract class modifier
    abstract_kw = 'abstract ' if (is_abstract(access) and kind == 'class') else ''
    declare_kw = 'declare ' if kind == 'class' else ''

    lines.append(f"export {declare_kw}{abstract_kw}{kind} {name}{generics}{extends_clause}{implements_clause} {{")

    # Fields
    for f in jc.fields:
        # Skip enum-internal fields
        if f.name in ('$VALUES', 'serialVersionUID'):
            continue
        ts = field_to_ts(f, opts, type_names)
        if ts:
            lines.append(ts)

    # Methods
    seen_sigs = set()
    for m in jc.methods:
        ts = method_to_ts(m, opts, type_names)
        if ts and ts not in seen_sigs:
            lines.append(ts)
            seen_sigs.add(ts)

    lines.append("}")

    if opts.emit_runtime_value and kind == 'interface':
        lines.append(f"export const {name} = Java.type<{name}>('{runtime_class_name}');")

    return '\n'.join(lines)


# ─── Main ─────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description='Generate TypeScript .d.ts from a JAR file')
    p.add_argument('jar', help='Path to the input .jar file')
    p.add_argument('--out', default='./types', help='Output directory (default: ./types)')
    p.add_argument('--package', default='', help='Filter to this package prefix (e.g. com/example)')
    p.add_argument('--single', action='store_true', help='Emit a single combined jar_types.ts')
    p.add_argument('--public-only', dest='public_only', action='store_true', default=True)
    p.add_argument('--include-protected', dest='public_only', action='store_false')
    p.add_argument('--no-generics', dest='no_generics', action='store_true', default=False)
    p.add_argument('--prefix', default='', help='Wrap everything in a namespace')
    p.add_argument('--emit-runtime-value', dest='emit_runtime_value', action='store_true', default=False,
                   help='Emit runtime Java.type(...) value bindings alongside generated types')
    return p.parse_args()

def main():
    opts = parse_args()

    if not os.path.exists(opts.jar):
        print(f"Error: file not found: {opts.jar}", file=sys.stderr)
        sys.exit(1)

    classes: list[JavaClass] = []
    errors: list[str] = []

    print(f"Reading JAR: {opts.jar}")

    with zipfile.ZipFile(opts.jar, 'r') as zf:
        names = [n for n in zf.namelist() if n.endswith('.class')]
        print(f"Found {len(names)} .class files")

        pkg_filter = opts.package.replace('.', '/')

        for name in names:
            # Skip synthetic/anonymous helper classes like Foo$1.class
            base = name[:-6]  # strip .class
            simple = base.split('/')[-1]
            if simple in ('package-info', 'module-info'):
                continue
            if re.match(r'^\d+$', simple):
                continue  # anonymous class
            if re.match(r'^.+\$\d+$', simple):
                continue  # inner anonymous class (e.g. Foo$1)

            if pkg_filter and not base.startswith(pkg_filter):
                continue

            try:
                data = zf.read(name)
                parser = ClassParser(data)
                jc = parser.parse()
                if jc:
                    classes.append(jc)
            except Exception as e:
                errors.append(f"{name}: {e}")

    print(f"Parsed {len(classes)} classes ({len(errors)} errors)")

    if errors and len(errors) < 20:
        for e in errors:
            print(f"  Warning: {e}", file=sys.stderr)

    all_class_names = {jc.class_name for jc in classes}
    type_names = build_type_name_map(classes)

    # Organize by package
    by_package: dict[str, list[JavaClass]] = {}
    for jc in classes:
        parts = jc.class_name.rsplit('/', 1)
        pkg = parts[0] if len(parts) > 1 else ''
        by_package.setdefault(pkg, []).append(jc)

    os.makedirs(opts.out, exist_ok=True)

    if opts.single:
        # Single file
        out_path = os.path.join(opts.out, 'jar_types.ts')
        with open(out_path, 'w') as f:
            f.write("/* eslint-disable */\n// @ts-nocheck\n// prettier-ignore\n// Auto-generated by jar2dts.py\n")
            f.write(f"// Source: {os.path.basename(opts.jar)}\n\n")
            if opts.prefix:
                f.write(f"declare namespace {opts.prefix} {{\n\n")
            for pkg in sorted(by_package.keys()):
                pkg_classes = sorted(by_package[pkg], key=lambda c: c.class_name)
                if pkg:
                    f.write(f"  // Package: {pkg.replace('/', '.')}\n")
                for jc in pkg_classes:
                    dts = class_to_dts(jc, opts, all_class_names, type_names)
                    if opts.prefix:
                        # Indent
                        indented = '\n'.join('  ' + l for l in dts.split('\n'))
                        f.write(indented + '\n\n')
                    else:
                        f.write(dts + '\n\n')
            if opts.prefix:
                f.write("}\n")
        print(f"Written: {out_path}")
    else:
        # Per-package files
        for pkg, pkg_classes in by_package.items():
            pkg_ts = pkg.replace('/', '.') or 'default'
            out_path = os.path.join(opts.out, f"{pkg_ts}.d.ts")
            with open(out_path, 'w') as f:
                f.write(f"// Auto-generated by jar2dts.py\n")
                f.write(f"// Package: {pkg_ts}\n\n")
                if opts.prefix:
                    f.write(f"declare namespace {opts.prefix} {{\n\n")
                for jc in sorted(pkg_classes, key=lambda c: c.class_name):
                    dts = class_to_dts(jc, opts, all_class_names, type_names)
                    if opts.prefix:
                        indented = '\n'.join('  ' + l for l in dts.split('\n'))
                        f.write(indented + '\n\n')
                    else:
                        f.write(dts + '\n\n')
                if opts.prefix:
                    f.write("}\n")
        print(f"Written {len(by_package)} .d.ts files to: {opts.out}")

    print("Done.")

if __name__ == '__main__':
    main()