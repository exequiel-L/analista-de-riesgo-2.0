import { useState, useRef } from "react";

// ── DESIGN SYSTEM ─────────────────────────────────────────────
const C = {
  black: "#0A0A0A", white: "#FFFFFF", cream: "#F5F2EC", gold: "#B8965A",
  goldLight: "#D4AF72", red: "#9B2335", redLight: "#F5ECEE", redBorder: "#D9A8AF",
  green: "#1B5E3B", greenLight: "#EBF4EE", greenBorder: "#8CBFA0",
  amber: "#8B6914", amberLight: "#F5F0E0", amberBorder: "#D4B87A",
  orange: "#8B3A14", orangeLight: "#F5EDE8", ink: "#1A1A1A",
  muted: "#6B6B6B", border: "#E2DDD6", surface: "#FAFAF8",
};

const ESTUDIO = {
  nombre: "Exequiel Larrascq & Asociados",
  tagline: "Derecho Empresarial & Startups · Maldonado, Uruguay",
  abogado: "Exequiel Larrascq",
  matricula: "[N°]",
  whatsapp: "59892000328",
  precio_reporte: 80,
};

const UPSELLS = [
  { id:"blindaje", icon:"🛡️", titulo:"Blindaje Legal de la Operación", desc:"Vale autónomo, reconocimiento de deuda certificado, fianza solidaria y carpeta completa instrumentada.", precio:(m)=>Math.max(350,Math.round(parseFloat(m)*0.03/50)*50), plazo:"48 hs", cta:"Blindar la operación" },
  { id:"revision", icon:"📋", titulo:"Revisión Legal Integral", desc:"Análisis del contrato, estructura societaria y cláusulas de incumplimiento. Incluye llamada de 30 min.", precio:()=>600, plazo:"72 hs", cta:"Solicitar revisión" },
  { id:"consultoria", icon:"💼", titulo:"Consulta Estratégica 1:1", desc:"60 minutos con Exequiel Larrascq para analizar la operación y definir la estrategia legal óptima.", precio:()=>200, plazo:"A convenir", cta:"Agendar consulta" },
];

// ── ARQUETIPOS ────────────────────────────────────────────────
function detectarArquetipo(acreedores) {
  if (!acreedores?.length) return null;
  const c5 = acreedores.filter(a => a.calif === "5").length;
  const c1 = acreedores.filter(a => ["1A","1C","2A"].includes(a.calif)).length;
  const total = acreedores.length;
  if (c5 > 0 && c1 > 0) return { id:"selectivo", nombre:"Deudor Selectivo", color:C.orange, bg:C.orangeLight, veredicto:"OPERAR CON BLINDAJE COMPLETO", veredictoSub:"Este perfil decide a quién paga. Sin estructura legal, la tuya es la deuda que abandona.", frase:"Paga a los que ejecutan. Ignora a los que no. Serás el tercero si no te instrumentás hoy.", estrategia:"Posicionarte como acreedor prioritario desde el primer documento. El instrumento define si cobrás o no." };
  if (c5 === total) return { id:"estructural", nombre:"Deudor Estructural", color:C.red, bg:C.redLight, veredicto:"NO OPERAR", veredictoSub:"Insolvencia generalizada. No hay capital de repago visible en ninguna institución.", frase:"No tiene con qué pagarte. No es mala voluntad — es ausencia de capacidad.", estrategia:"Rechazar la operación o exigir garantía real verificada de valor superior al 150% del monto." };
  if (c5 >= 1 && total <= 2) return { id:"caida", nombre:"Deudor en Caída", color:C.red, bg:C.redLight, veredicto:"OPERAR SOLO CON GARANTÍA REAL", veredictoSub:"El perfil muestra deterioro activo. El riesgo crece con el tiempo, no se estabiliza.", frase:"La trayectoria importa más que el número. Este perfil empeora.", estrategia:"Plazo corto, monto conservador, garantía real verificada y cláusula de aceleración inmediata." };
  return { id:"recuperable", nombre:"Deudor Recuperable", color:C.amber, bg:C.amberLight, veredicto:"OPERAR CON CAUTELA", veredictoSub:"Hay señales mixtas. El riesgo es manejable con la arquitectura correcta.", frase:"No es un perfil ideal — pero tampoco es una trampa. Dependé de cómo estructurés la operación.", estrategia:"Plazo acotado, cuotas frecuentes, monitoreo mensual y carpeta de desembolso completa." };
}

function calcularEscenarios(monto) {
  const m = parseFloat(monto)||0;
  return [
    { nombre:"Sin blindaje", color:C.red, perdida:m, plazo:"18–36 meses", prob:"23%", desc:"Juicio ordinario sin título ejecutivo. Proceso largo, caro y con alta probabilidad de pérdida total." },
    { nombre:"Blindaje básico", color:C.amber, perdida:Math.round(m*0.12), plazo:"3–6 meses", prob:"71%", desc:"Vale autónomo y reconocimiento de deuda. Proceso monitorio rápido. Recupero parcial posible." },
    { nombre:"Blindaje completo", color:C.green, perdida:0, plazo:"30–60 días", prob:"94%", desc:"Carpeta completa con garantía verificada y fianza solidaria. Ejecución fulminante con patrimonio de respaldo." },
  ];
}

function calcularVigencia(fechaLIDECO) {
  const base = fechaLIDECO ? new Date(fechaLIDECO) : new Date();
  const venc = new Date(base); venc.setDate(venc.getDate()+30);
  const dias = Math.ceil((venc - new Date())/(1000*60*60*24));
  return { venc, dias, critico: dias<=7, expirado: dias<=0 };
}

function fmtDate(d) {
  const dt = d||new Date();
  const m=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${dt.getDate()} de ${m[dt.getMonth()]} de ${dt.getFullYear()}`;
}

function waLink(titulo, data, ctx, num) {
  const msg = encodeURIComponent(`Hola Exequiel, recibí el Reporte REP-${num} sobre ${data?.nombre||"el sujeto"} (${ctx?.tipo_operacion||""} USD ${ctx?.monto||""}) y quiero consultar sobre: ${titulo}.`);
  return `https://wa.me/${ESTUDIO.whatsapp}?text=${msg}`;
}

// ── APIS ──────────────────────────────────────────────────────
async function verificarPEP(nombre) {
  try {
    const url = "https://catalogodatos.gub.uy/dataset/bcf06dc6-c41e-4307-b466-8168e7556542/resource/fdb17214-13a8-4604-acec-b11a1c612957/download/lista-actualizada-de-pep.csv";
    const res = await fetch(url); if (!res.ok) throw new Error();
    const text = await res.text();
    const norm = s=>s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z ]/g," ").trim();
    const partes = norm(nombre).split(" ").filter(p=>p.length>2);
    const matches=[];
    for (const line of text.split("\n").slice(1).filter(l=>l.trim())) {
      if (partes.filter(p=>norm(line).includes(p)).length>=2) {
        const c=line.split(","); matches.push({nombre:c[0]||"",cargo:c[1]||"",organismo:c[2]||""});
      }
    }
    return {ok:true,encontrado:matches.length>0,matches,fuente:"SENACLAFT · Lista PEP V60",fecha:"13/02/2026"};
  } catch { return {ok:false,encontrado:false,matches:[],error:true,fuente:"SENACLAFT",fecha:fmtDate()}; }
}

async function verificarUDECO(rut,nombre) {
  try {
    const url="https://catalogodatos.gub.uy/dataset/85e54885-c53d-45b5-893c-02471cb0f44d/resource/fcdb2d2b-eecb-44c1-a079-92b79c2fefcb/download/datos_sanciones_2017_2024.csv";
    const res=await fetch(url); if (!res.ok) throw new Error();
    const text=await res.text(); const lines=text.split("\n");
    const headers=lines[0].split(",").map(h=>h.trim().replace(/"/g,"").toLowerCase());
    const norm=s=>(s||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9 ]/g," ").trim();
    const rutN=(rut||"").replace(/\D/g,""); const sanciones=[];
    for (const line of lines.slice(1).filter(l=>l.trim())) {
      const cols=line.match(/(".*?"|[^,]+)(?=,|$)/g)||line.split(",");
      const row={}; headers.forEach((h,i)=>{row[h]=(cols[i]||"").replace(/"/g,"").trim();});
      const rR=(row["rut"]||"").replace(/\D/g,""); const nR=norm(row["empresa"]||row["razon_social"]||"");
      const nomN=norm(nombre||"");
      if ((rutN&&rR&&rR.includes(rutN))||(nomN.split(" ").filter(p=>p.length>2).filter(p=>nR.includes(p)).length>=2))
        sanciones.push({fecha:row["fecha"]||"—",tipo:row["tipo_sancion"]||"—",motivo:row["motivo"]||"—",monto:row["monto"]||"—",departamento:row["departamento"]||"—"});
    }
    return {ok:true,encontrado:sanciones.length>0,sanciones,total:sanciones.length};
  } catch { return {ok:false,encontrado:false,sanciones:[],error:true}; }
}

async function callClaude(messages,system,webSearch=false) {
  const body={model:"claude-sonnet-4-20250514",max_tokens:1000,system,messages};
  if (webSearch) body.tools=[{type:"web_search_20250305",name:"web_search"}];
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json();
  return (d.content||[]).map(b=>b.text||"").filter(Boolean).join("");
}

async function analizarConsistencia(data,ctx) {
  try {
    const prompt=`Sos un abogado uruguayo experto en riesgo crediticio. Analizá la CONSISTENCIA BIOGRÁFICA de este sujeto.
DATOS: Nombre: ${data.nombre}, Tipo: ${data.tipo_sujeto}, Giro: ${data.giro||"Sin actividad"}, Acreedores: ${data.acreedores_detalle?.map(a=>`${a.nombre} (CALIF:${a.calif})`).join(", ")}, Deuda total: USD ${data.total_creditos}, Garantías a terceros: ${data.garantias_no_comp&&data.garantias_no_comp!=="0,00"?"USD "+data.garantias_no_comp:"ninguna"}
OPERACIÓN: ${ctx.tipo_operacion} por USD ${ctx.monto}, relación previa: ${ctx.relacion_previa}
Devolvé SOLO JSON: {"score_consistencia":número 0-100,"nivel":"Alta|Media|Baja|Muy Baja","titular":"frase directa 10-15 palabras","hallazgos":[{"tipo":"alerta|neutro|positivo","texto":"observación en 2da persona"}],"conclusion":"2-3 oraciones directas como abogado de confianza"}`;
    const txt=await callClaude([{role:"user",content:prompt}],`Analista legal uruguayo. SOLO JSON válido sin backticks.`);
    return JSON.parse(txt.replace(/```json|```/g,"").trim());
  } catch { return {score_consistencia:50,nivel:"Media",titular:"Análisis de consistencia no disponible",hallazgos:[{tipo:"neutro",texto:"Revisá manualmente la coherencia entre actividad declarada y perfil crediticio."}],conclusion:"La consistencia biográfica requiere verificación manual en este caso."}; }
}

// ── UI HELPERS ────────────────────────────────────────────────
function Pill({children,color,bg}) {
  return <span style={{display:"inline-block",padding:"4px 12px",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color,background:bg,border:`1px solid ${color}33`}}>{children}</span>;
}

function SecLabel({n,title,sub}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
      <div style={{fontFamily:"Georgia,serif",fontSize:11,color:C.gold,letterSpacing:3,textTransform:"uppercase",flexShrink:0}}>{n}</div>
      <div style={{flex:1,height:"1px",background:`linear-gradient(to right, ${C.gold}44, transparent)`}}/>
      <div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.ink,textAlign:"right"}}>{title}</div>
        {sub&&<div style={{fontSize:9,color:C.muted,letterSpacing:1,textAlign:"right",marginTop:2}}>{sub}</div>}
      </div>
    </div>
  );
}

function FuenteRow({icon,label,status,statusColor,detail,src,date}) {
  return (
    <div style={{display:"flex",gap:14,padding:"14px 0",borderBottom:`1px solid ${C.border}`}}>
      <span style={{fontSize:18,flexShrink:0,marginTop:2}}>{icon}</span>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:4,flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:C.ink}}>{label}</span>
          <span style={{fontSize:11,fontWeight:600,color:statusColor}}>{status}</span>
        </div>
        <div style={{fontSize:11.5,color:C.muted,lineHeight:1.65}}>{detail}</div>
      </div>
      <div style={{textAlign:"right",flexShrink:0,minWidth:120}}>
        <div style={{fontSize:9,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"#C0BAB0"}}>{src}</div>
        <div style={{fontSize:10,color:"#C0BAB0",marginTop:2}}>{date}</div>
      </div>
    </div>
  );
}

function ScoreRing({score,nivel,color}) {
  const r=36; const circ=2*Math.PI*r; const dash=(score/100)*circ;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke={C.border} strokeWidth="6"/>
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round"/>
        <text x="44" y="48" textAnchor="middle" fill={color} fontSize="16" fontWeight="800" fontFamily="Georgia,serif">{score}</text>
      </svg>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color}}>{nivel}</div>
    </div>
  );
}

// ── REPORTE ───────────────────────────────────────────────────
function Reporte({data,ctx,verif,webData,udecoData,consistencia,numReporte}) {
  const esPJ=data.tipo_sujeto==="Persona Jurídica";
  const arquetipo=detectarArquetipo(data.acreedores_detalle);
  const escenarios=calcularEscenarios(ctx?.monto||0);
  const vigencia=calcularVigencia(data.fecha_emision);
  const monto=parseFloat(ctx?.monto)||0;
  const tipoOp={prestamo:"Préstamo / Mutuo",venta_credito:"Venta a Crédito",sociedad:"Constitución de Sociedad",locacion:"Locación",servicios:"Contrato de Servicios",otro:"Operación Comercial"}[ctx?.tipo_operacion]||"Operación";
  const consColor=consistencia?(consistencia.score_consistencia>=70?C.green:consistencia.score_consistencia>=45?C.amber:C.red):C.muted;
  const tipoIcono={alerta:"⚠",neutro:"→",positivo:"✓"};
  const tipoColor={alerta:C.red,neutro:C.muted,positivo:C.green};

  return (
    <div style={{background:C.white,fontFamily:"Georgia,'Times New Roman',serif",color:C.ink}}>

      {/* PORTADA */}
      <div style={{background:C.black,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 20% 50%, #1A1A0A 0%, transparent 60%), radial-gradient(circle at 80% 20%, #0A0A1A 0%, transparent 50%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",padding:"44px 52px"}}>

          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",paddingBottom:28,borderBottom:"1px solid #222",marginBottom:32}}>
            <div>
              <div style={{fontFamily:"Georgia,serif",fontSize:16,color:C.white,letterSpacing:2,marginBottom:5}}>{ESTUDIO.nombre}</div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:3,textTransform:"uppercase",color:C.gold}}>{ESTUDIO.tagline}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,fontWeight:600,letterSpacing:2,color:C.gold,marginBottom:4}}>REP-{numReporte}</div>
              <div style={{fontSize:11,color:"#555",marginBottom:8}}>{fmtDate()}</div>
              <div style={{display:"inline-block",padding:"4px 12px",background:vigencia.critico?"#9B233522":"#1B5E3B22",border:`1px solid ${vigencia.critico?C.red:C.green}44`}}>
                <span style={{fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:vigencia.critico?C.red:C.green}}>
                  {vigencia.expirado?"⚠ INFORME EXPIRADO":vigencia.critico?`⚠ Vence en ${vigencia.dias} días`:`Vigente · ${vigencia.dias} días`}
                </span>
              </div>
            </div>
          </div>

          {/* Operación */}
          <div style={{marginBottom:32}}>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:4,textTransform:"uppercase",color:"#444",marginBottom:10}}>Operación evaluada</div>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontFamily:"Georgia,serif",fontSize:22,color:C.white}}>{tipoOp}</span>
              <span style={{fontSize:9,color:"#333"}}>·</span>
              <span style={{fontFamily:"Georgia,serif",fontSize:22,color:C.gold}}>USD {monto.toLocaleString("es-UY")}</span>
              {ctx?.plazo&&<><span style={{fontSize:9,color:"#333"}}>·</span><span style={{fontSize:15,color:"#555"}}>{ctx.plazo} meses</span></>}
            </div>
            <div style={{marginTop:8,fontSize:13,color:"#555"}}>{data.nombre} · {esPJ?`RUT ${data.num_doc}`:`C.I. ${data.num_doc}`}</div>
          </div>

          {/* P1 */}
          <div style={{marginBottom:24,paddingBottom:24,borderBottom:"1px solid #1A1A1A"}}>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:4,textTransform:"uppercase",color:"#333",marginBottom:14}}>¿Opero?</div>
            <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
              <div style={{width:4,background:arquetipo?.color||C.gold,alignSelf:"stretch",flexShrink:0,minHeight:40}}/>
              <div>
                <div style={{fontFamily:"Georgia,serif",fontSize:26,color:arquetipo?.color||C.gold,marginBottom:8,lineHeight:1.2}}>{arquetipo?.veredicto||"EVALUAR CON CRITERIO"}</div>
                <div style={{fontSize:13,color:"#666",lineHeight:1.7,maxWidth:500}}>{arquetipo?.veredictoSub}</div>
                {arquetipo&&<div style={{marginTop:12,padding:"10px 16px",background:"#111",borderLeft:`2px solid ${arquetipo.color}`,display:"inline-block"}}><span style={{fontSize:12,color:"#888",fontStyle:"italic"}}>"{arquetipo.frase}"</span></div>}
              </div>
            </div>
            {arquetipo&&<div style={{marginTop:14,display:"inline-flex",gap:10,alignItems:"center"}}><span style={{fontSize:9,color:"#444",letterSpacing:2,textTransform:"uppercase"}}>Arquetipo</span><Pill children={arquetipo.nombre} color={arquetipo.color} bg={arquetipo.bg+"33"}/></div>}
          </div>

          {/* P2 */}
          <div style={{marginBottom:24,paddingBottom:24,borderBottom:"1px solid #1A1A1A"}}>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:4,textTransform:"uppercase",color:"#333",marginBottom:14}}>¿Cuánto arriesgo si falla?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:2}}>
              {escenarios.map((e,i)=>(
                <div key={i} style={{background:"#111",padding:"18px 16px",borderTop:`2px solid ${e.color}`}}>
                  <div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"#444",marginBottom:10}}>{e.nombre}</div>
                  <div style={{fontFamily:"Georgia,serif",fontSize:22,color:e.color,marginBottom:4}}>{e.perdida===0?"USD 0":`USD ${e.perdida.toLocaleString("es-UY")}`}</div>
                  <div style={{fontSize:10,color:"#555",marginBottom:8}}>pérdida estimada</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:10,color:"#444"}}>Recupero</span><span style={{fontSize:10,fontWeight:700,color:e.color}}>{e.prob}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:10,color:"#444"}}>Plazo</span><span style={{fontSize:10,color:"#666"}}>{e.plazo}</span>
                  </div>
                </div>
              ))}
            </div>
            {monto>0&&<div style={{marginTop:10,padding:"10px 16px",background:"#111",fontSize:11,color:"#666",lineHeight:1.6}}>El blindaje completo cuesta <span style={{color:C.gold,fontWeight:700}}>USD {UPSELLS[0].precio(monto).toLocaleString("es-UY")}</span> — el <span style={{color:C.gold}}>{((UPSELLS[0].precio(monto)/monto)*100).toFixed(1)}%</span> del capital. La pérdida sin cobertura es el <span style={{color:C.red}}>100%</span>.</div>}
          </div>

          {/* P3 */}
          <div style={{marginBottom:32}}>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:4,textTransform:"uppercase",color:"#333",marginBottom:14}}>¿Cuánto cuesta cubrirme?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:2}}>
              {UPSELLS.map((u,i)=>{
                const precio=u.precio(monto); const roi=monto>0?((monto/precio)).toFixed(1):null;
                return (
                  <div key={i} style={{background:"#0D0D0D",border:"1px solid #1A1A1A",padding:"18px 16px",display:"flex",flexDirection:"column"}}>
                    <div style={{fontSize:18,marginBottom:10}}>{u.icon}</div>
                    <div style={{fontSize:11,fontWeight:700,color:C.white,marginBottom:6,lineHeight:1.4}}>{u.titulo}</div>
                    <div style={{fontSize:11,color:"#555",lineHeight:1.5,marginBottom:10,flex:1}}>{u.desc}</div>
                    <div style={{fontFamily:"Georgia,serif",fontSize:20,color:C.gold,marginBottom:3}}>USD {precio.toLocaleString("es-UY")}</div>
                    {roi&&<div style={{fontSize:9,color:"#444",marginBottom:12}}>ROI potencial: {roi}× sobre el capital</div>}
                    <a href={waLink(u.titulo,data,ctx,numReporte)} target="_blank" rel="noreferrer"
                      style={{display:"block",textAlign:"center",background:C.gold,color:C.black,padding:"9px",fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",textDecoration:"none"}}>
                      {u.cta} →
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nota abogado */}
          <div style={{background:"#080808",border:"1px solid #1A1A1A",padding:"22px 26px"}}>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:4,textTransform:"uppercase",color:C.gold,marginBottom:12}}>Nota del Abogado</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:14,color:"#777",lineHeight:1.9,fontStyle:"italic",marginBottom:16}}>"{arquetipo?.estrategia||"Este caso requiere revisión antes de cualquier desembolso."}"</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12,color:C.white,fontWeight:600}}>{ESTUDIO.abogado}</div>
                <div style={{fontSize:10,color:"#444"}}>Abogado · Matrícula {ESTUDIO.matricula}</div>
              </div>
              <a href={`https://wa.me/${ESTUDIO.whatsapp}?text=${encodeURIComponent(`Hola Exequiel, consulto sobre REP-${numReporte}.`)}`} target="_blank" rel="noreferrer"
                style={{display:"flex",gap:8,alignItems:"center",background:"#111",border:"1px solid #222",padding:"10px 18px",textDecoration:"none"}}>
                <span style={{fontSize:16}}>💬</span>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:C.gold}}>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* MÓDULO A */}
      <div style={{padding:"48px 52px",background:C.white}}>
        <SecLabel n="A" title="El Sujeto" sub="Identidad · Integridad · Fuentes oficiales"/>
        <div style={{fontSize:13,lineHeight:1.9,color:C.muted,marginBottom:24,maxWidth:560}}>
          Estás evaluando a <strong style={{color:C.ink}}>{data.nombre}</strong> — {data.tipo_sujeto.toLowerCase()}{data.giro?` con giro declarado en ${data.giro}`:" sin actividad empresarial declarada ante la DGI"}. Verificamos {esPJ?"cinco":"cuatro"} fuentes oficiales antes de emitir este reporte.
        </div>
        <FuenteRow icon="🏦" label="LIDECO — Central de Riesgos BCU" status={`✗ Riesgo ${data.nivel_riesgo}`} statusColor={C.red} detail={`${data.acreedores_detalle?.length||0} institución${(data.acreedores_detalle?.length||0)!==1?"es":""} te lo muestran como riesgo alto. Total comprometido: USD ${data.total_creditos}. Mora activa >60 días: USD ${data.atraso_usd}.`} src="LIDECO" date="BCU al 31/12/2025"/>
        {!esPJ&&<FuenteRow icon="🛡️" label="Lista PEP — SENACLAFT" status={verif.pep.error?"· Sin conexión":verif.pep.encontrado?"✗ FIGURA EN LISTA PEP":"✓ No figura"} statusColor={verif.pep.error?C.muted:verif.pep.encontrado?C.red:C.green} detail={verif.pep.encontrado?`Alerta: ${verif.pep.matches[0]?.cargo} en ${verif.pep.matches[0]?.organismo}. Requiere diligencia intensificada.`:"No ostenta funciones públicas de importancia en los últimos 5 años."} src={verif.pep.fuente} date={verif.pep.fecha}/>}
        <FuenteRow icon="🏛️" label="RUPE — Registro de Proveedores del Estado" status={verif.rupe==="inscripto"?"✓ Inscripto":verif.rupe==="no_inscripto"?"⚠ No inscripto":"· Pendiente"} statusColor={verif.rupe==="inscripto"?C.green:verif.rupe==="no_inscripto"?C.amber:C.muted} detail={verif.rupe==="inscripto"?"Habilitado para contratar con el Estado.":"No figura habilitado para contratos estatales. Opera exclusivamente en el ámbito privado."} src="ARCE · comprasestatales.gub.uy" date={fmtDate()}/>
        <FuenteRow icon="🔍" label="Búsqueda Web — Prensa y registros abiertos" status={webData.hallazgos?.length>0?`⚠ ${webData.hallazgos.length} hallazgo${webData.hallazgos.length>1?"s":""}`:"✓ Sin hallazgos"} statusColor={webData.hallazgos?.length>0?C.amber:C.green} detail={webData.summary||"No encontramos menciones relevantes en prensa ni registros públicos digitales."} src="Búsqueda web" date={fmtDate()}/>
        {esPJ&&<FuenteRow icon="⚖️" label="UDECO — Sanciones Defensa del Consumidor" status={udecoData?.encontrado?`✗ ${udecoData.total} sanción${udecoData.total>1?"es":""}`:"✓ Sin sanciones"} statusColor={udecoData?.encontrado?C.red:C.green} detail={udecoData?.encontrado?"Esta empresa recibió sanciones de Defensa del Consumidor 2017–2024. Eso dice algo sobre cómo opera con sus contrapartes.":"Sin infracciones ante Defensa del Consumidor 2017–2024."} src="UDECO · MIEM" date="2017–2024"/>}
      </div>

      <div style={{height:1,background:C.border}}/>

      {/* MÓDULO B — CONSISTENCIA */}
      {consistencia&&(
        <>
          <div style={{padding:"48px 52px",background:C.surface}}>
            <SecLabel n="B" title="Consistencia Biográfica" sub="¿La historia que cuentan estos datos tiene sentido?"/>
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:32,alignItems:"start",marginBottom:28}}>
              <ScoreRing score={consistencia.score_consistencia} nivel={consistencia.nivel} color={consColor}/>
              <div>
                <div style={{fontFamily:"Georgia,serif",fontSize:18,color:C.ink,lineHeight:1.5,marginBottom:10}}>{consistencia.titular}</div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.8}}>{consistencia.conclusion}</div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {consistencia.hallazgos?.map((h,i)=>(
                <div key={i} style={{display:"flex",gap:14,padding:"13px 16px",background:C.white,border:`1px solid ${C.border}`,borderLeft:`3px solid ${tipoColor[h.tipo]||C.muted}`}}>
                  <span style={{fontSize:14,flexShrink:0,color:tipoColor[h.tipo],fontWeight:700}}>{tipoIcono[h.tipo]}</span>
                  <div style={{fontSize:12.5,color:C.muted,lineHeight:1.7}}>{h.texto}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{height:1,background:C.border}}/>
        </>
      )}

      {/* MÓDULO C — RIESGO */}
      <div style={{padding:"48px 52px",background:C.white}}>
        <SecLabel n="C" title="El Riesgo" sub="Radiografía crediticia · Arquetipo · Escenario de pérdida"/>
        {arquetipo&&(
          <div style={{background:arquetipo.bg,border:`1px solid ${arquetipo.color}33`,borderLeft:`4px solid ${arquetipo.color}`,padding:"20px 24px",marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div><div style={{fontSize:9,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",color:C.muted,marginBottom:6}}>Arquetipo de riesgo</div><div style={{fontFamily:"Georgia,serif",fontSize:22,color:arquetipo.color}}>{arquetipo.nombre}</div></div>
              <Pill children={`Riesgo ${data.nivel_riesgo}`} color={arquetipo.color} bg={arquetipo.bg}/>
            </div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.8}}><strong style={{color:C.ink}}>Estrategia:</strong> {arquetipo.estrategia}</div>
          </div>
        )}
        <table style={{width:"100%",borderCollapse:"collapse",border:`1px solid ${C.border}`,marginBottom:2}}>
          <thead><tr style={{background:C.black}}>{["Institución","CALIF","Categoría BCU","Lectura"].map(h=><th key={h} style={{color:C.gold,fontSize:9,fontWeight:600,letterSpacing:2,textTransform:"uppercase",padding:"11px 14px",textAlign:"left"}}>{h}</th>)}</tr></thead>
          <tbody>{(data.acreedores_detalle||[]).map((a,i)=>(
            <tr key={i} style={{background:i%2===0?C.white:C.surface}}>
              <td style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,fontSize:12}}><strong>{a.nombre}</strong></td>
              <td style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}><span style={{display:"inline-block",padding:"3px 9px",fontSize:10,fontWeight:700,background:a.calif==="5"?C.redLight:C.greenLight,color:a.calif==="5"?C.red:C.green,border:`1px solid ${a.calif==="5"?C.redBorder:C.greenBorder}`}}>{a.calif}</span></td>
              <td style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.muted}}>{a.categoria}</td>
              <td style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:700,color:a.calif==="5"?C.red:C.green}}>{a.calif==="5"?"✗ Abandonado":"✓ Prioritario"}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",border:`1px solid ${C.border}`,marginBottom:28}}>
          {[{l:"Tu exposición",v:`USD ${monto.toLocaleString("es-UY")}`,red:true},{l:"Riesgo potencial total",v:`USD ${data.riesgo_potencial}`,red:true},{l:"Mora activa ≥60 días",v:`USD ${data.atraso_usd}`,red:true},{l:"Deudas vigentes",v:`USD ${data.vigentes_usd}`},{l:"Garantías no comp.",v:`USD ${data.garantias_no_comp||"0,00"}`,yellow:data.garantias_no_comp&&data.garantias_no_comp!=="0,00"},{l:"Garantía ofrecida",v:ctx?.garantia_ofrecida?ctx.garantia_detalle||"Ofrecida":"Ninguna",green:!!ctx?.garantia_ofrecida}].map((c,i)=>(
            <div key={i} style={{padding:"15px 18px",borderRight:(i+1)%3===0?"none":`1px solid ${C.border}`,borderBottom:i<3?`1px solid ${C.border}`:"none",background:c.red?C.redLight:c.green?C.greenLight:c.yellow?C.amberLight:C.white}}>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:2,textTransform:"uppercase",color:C.muted,marginBottom:7}}>{c.l}</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:16,color:c.red?C.red:c.green?C.green:c.yellow?C.amber:C.ink}}>{c.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{height:1,background:C.border}}/>

      {/* MÓDULO D — OPERACIÓN */}
      <div style={{padding:"48px 52px",background:C.surface}}>
        <SecLabel n="D" title="La Operación" sub={`Arquitectura legal · ${tipoOp} · USD ${monto.toLocaleString("es-UY")}`}/>
        <div style={{marginBottom:32}}>
          {[
            {n:"01",title:"Vale Autónomo — Decreto-Ley 14.701",body:"El instrumento más eficaz disponible en Uruguay. Abstracto, con mora automática. Si no paga, vas directo al proceso monitorio sin demostrar nada más.",tag:"⚡ Recupero en 30–60 días",fast:true},
            {n:"02",title:"Reconocimiento de Deuda Certificado — Art. 353 CGP",body:"Firmas certificadas notarialmente. Título ejecutivo de respaldo que refuerza la posición ante cualquier contingencia procesal.",tag:"⚡ Recupero en 45–90 días",fast:true},
            ...(ctx?.tipo_operacion==="sociedad"?[{n:"03",title:"Prenda de Participaciones + Cláusula de Exclusión",body:"Para operaciones societarias: prenda sobre cuotas con derechos políticos. Permite excluir al socio en default sin liquidar la sociedad.",tag:"⏱ Previo a la constitución",fast:false}]:[]),
            ...(ctx?.tipo_operacion==="locacion"?[{n:"03",title:"Depósito en Garantía + Resolución Automática",body:"Depósito mínimo de 2 meses de renta. Cláusula de resolución automática ante mora de 30 días. Sin esta cláusula un desalojo puede demorar 18 meses.",tag:"⏱ Al firmar el contrato",fast:false}]:[]),
            {n:esPJ?"04":"03",title:"Fianza Solidaria — Factor Bio-Legal",body:`Firma del cónyuge o concubino con convivencia ≥5 años (Ley 18.246 + 15.597). ${esPJ?"Para PJ: fianza personal del representante legal además. Art. 391 Ley 16.060.":"Cierra la posibilidad de vaciamiento patrimonial abusivo."}`,tag:"⏱ Previo al desembolso",fast:false},
            ...(ctx?.garantia_ofrecida?[{n:"✓",title:`Verificación de Garantía — ${ctx.garantia_ofrecida}`,body:`${ctx.garantia_detalle||ctx.garantia_ofrecida}. Antes de firmar: titulación limpia, sin cargas previas, valuación actualizada. Una garantía mal verificada es igual a no tener ninguna.`,tag:"⚡ Antes de cualquier firma",fast:true}]:[]),
          ].map((item,i,arr)=>(
            <div key={i} style={{display:"flex",gap:20,padding:"18px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:13,color:C.gold,flexShrink:0,width:28,paddingTop:2}}>{item.n}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:6}}>{item.title}</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.75,marginBottom:8}}>{item.body}</div>
                <Pill children={item.tag} color={item.fast?C.green:C.amber} bg={item.fast?C.greenLight:C.amberLight}/>
              </div>
            </div>
          ))}
        </div>

        {/* Carpeta */}
        <div style={{marginBottom:32}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.muted,marginBottom:14}}>No desembolsés sin estos documentos</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2}}>
            {[
              {icon:"🪪",label:esPJ?"Estatuto Social + Poderes Vigentes":"Cédula de Identidad Vigente",sub:"Verificación presencial obligatoria."},
              {icon:"📜",label:"Vales Autónomos Suscritos",sub:`USD ${monto.toLocaleString("es-UY")} · mora automática · domicilio especial.`},
              {icon:"✍️",label:"Reconocimiento de Deuda Certificado",sub:"Art. 353 CGP · con cláusula de aceleración automática."},
              {icon:"🤝",label:esPJ?"Fianza del Representante Legal":"Fianza Solidaria + Firma Cónyuge",sub:esPJ?"Art. 391 Ley 16.060.":"Ley 18.246 + 15.597."},
              ...(ctx?.garantia_ofrecida?[{icon:"🔐",label:`Garantía instrumentada — ${ctx.garantia_ofrecida}`,sub:ctx.garantia_detalle||"Titulación + cargas + valuación verificadas."}]:[]),
            ].map((d,i)=>(
              <div key={i} style={{background:C.white,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.red}`,padding:"14px 18px",display:"flex",gap:12}}>
                <span style={{fontSize:18,flexShrink:0}}>{d.icon}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.ink,marginBottom:3}}>{d.label}</div>
                  <div style={{fontSize:11,color:C.muted,lineHeight:1.5,marginBottom:6}}>{d.sub}</div>
                  <Pill children="Obligatorio" color={C.red} bg={C.redLight}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Señales */}
        <div style={{background:C.white,border:`1px solid ${C.border}`,padding:"22px 26px",marginBottom:28}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.muted,marginBottom:16}}>Tres señales que tenés que monitorear</div>
          {[
            arquetipo?.id==="selectivo"?"Un nuevo CALIF: 5 en la próxima actualización BCU indicaría que amplió su lista de abandonos.":"Nuevo acreedor con clasificación de riesgo alto en próxima consulta BCU.",
            "Atraso en BPS o DGI detectado por monitoreo mensual — anticipa problemas de liquidez antes de que lleguen a vos.",
            ctx?.garantia_ofrecida?"Cualquier movimiento sobre la garantía ofrecida — transferencia, gravamen o inhibición — requiere tu acción inmediata.":"Proceso ejecutivo iniciado por cualquier acreedor listado — el que actúa primero cobra primero.",
          ].map((a,i)=>(
            <div key={i} style={{display:"flex",gap:14,marginBottom:12,paddingBottom:12,borderBottom:i<2?`1px solid ${C.border}`:"none"}}>
              <div style={{width:24,height:24,background:C.amberLight,border:`1px solid ${C.amberBorder}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                <span style={{fontSize:10,fontWeight:800,color:C.amber}}>{i+1}</span>
              </div>
              <div style={{fontSize:12.5,color:C.muted,lineHeight:1.75}}>{a}</div>
            </div>
          ))}
        </div>

        {/* Próximos pasos */}
        <div style={{background:C.black,padding:"28px 32px"}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.gold,marginBottom:20}}>Lo que hacés esta semana</div>
          {[
            "Pedile al sujeto la documentación de la carpeta antes de acordar fecha de firma. Quien pone condiciones primero define el tono de la relación.",
            `Contactá el estudio para instrumentar la arquitectura legal completa (48 horas, USD ${UPSELLS[0].precio(monto).toLocaleString("es-UY")}). No lo dejes para después.`,
            "No desembolsés hasta tener la carpeta completa con firmas certificadas en tu poder. Sin eso, cualquier acuerdo verbal es una promesa sin respaldo.",
          ].map((p,i)=>(
            <div key={i} style={{display:"flex",gap:16,marginBottom:16,paddingBottom:16,borderBottom:i<2?"1px solid #1A1A1A":"none"}}>
              <div style={{width:28,height:28,background:C.gold,color:C.black,fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12.5,color:"#888",lineHeight:1.75}}>{p}</div>
            </div>
          ))}
          <a href={waLink(UPSELLS[0].titulo,data,ctx,numReporte)} target="_blank" rel="noreferrer"
            style={{display:"block",textAlign:"center",background:C.gold,color:C.black,padding:"14px",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",textDecoration:"none",marginTop:4}}>
            💬 Hablar con Exequiel ahora →
          </a>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{borderTop:`2px solid ${C.black}`,padding:"24px 52px",background:C.cream,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div style={{fontSize:9.5,color:"#A09888",maxWidth:460,lineHeight:1.8}}>
          Fuentes: LIDECO · BCU · DGI · SENACLAFT · ARCE/RUPE{esPJ?" · UDECO/MIEM (2017–2024)":""} · Búsqueda web. Datos BCU al 31/12/2025. Informe válido hasta el {fmtDate(vigencia.venc)}. No constituye opinión legal vinculante. Precio del reporte: USD {ESTUDIO.precio_reporte}.
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{width:140,height:1,background:"#C8BFB0",marginBottom:10,marginLeft:"auto"}}/>
          <div style={{fontFamily:"Georgia,serif",fontSize:13,color:C.ink}}>{ESTUDIO.abogado}</div>
          <div style={{fontSize:9,color:C.muted,marginTop:2}}>Abogado · Matrícula {ESTUDIO.matricula}</div>
        </div>
      </div>
    </div>
  );
}

// ── FORMULARIO ────────────────────────────────────────────────
function FormularioContexto({onSubmit}) {
  const [ctx,setCtx]=useState({monto:"",plazo:"",tipo_operacion:"",relacion_previa:"ninguna",garantia_ofrecida:"",garantia_detalle:"",historial_pago:""});
  const set=(k,v)=>setCtx(c=>({...c,[k]:v}));
  const ok=ctx.monto&&ctx.tipo_operacion;
  const tiposOp=[{value:"",label:"Tipo de operación..."},{value:"prestamo",label:"Préstamo / Mutuo"},{value:"venta_credito",label:"Venta a crédito"},{value:"sociedad",label:"Constitución de sociedad"},{value:"locacion",label:"Locación / Arrendamiento"},{value:"servicios",label:"Contrato de servicios"},{value:"otro",label:"Otra"}];
  const relOpts=[{value:"ninguna",label:"Primera operación"},{value:"buena",label:"Relación previa — buen historial"},{value:"regular",label:"Relación previa — algún atraso"},{value:"mala",label:"Relación previa — incumplimientos"},{value:"referido",label:"Referido por tercero"}];
  const garOpts=[{value:"",label:"Sin garantía ofrecida"},{value:"inmueble",label:"Garantía hipotecaria"},{value:"vehiculo",label:"Prenda — vehículo"},{value:"fiador",label:"Fiador / codeudor"},{value:"cheques",label:"Cheques diferidos"},{value:"deposito",label:"Depósito en garantía"},{value:"otro",label:"Otra garantía"}];
  const inp=(v,fn,ph,t="text")=><input type={t} value={v} onChange={e=>fn(e.target.value)} placeholder={ph} style={{width:"100%",padding:"12px 14px",border:`1px solid ${C.border}`,fontSize:13,color:C.ink,fontFamily:"Georgia,serif",outline:"none",background:C.white,boxSizing:"border-box"}}/>;
  const sel=(v,fn,opts)=><select value={v} onChange={e=>fn(e.target.value)} style={{width:"100%",padding:"12px 14px",border:`1px solid ${C.border}`,fontSize:13,color:v?C.ink:"#aaa",fontFamily:"Georgia,serif",outline:"none",background:C.white,appearance:"none"}}>{opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  const lbl=(t)=><div style={{fontSize:9,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",color:C.muted,marginBottom:8}}>{t}</div>;
  return (
    <div style={{maxWidth:600,margin:"0 auto"}}>
      <div style={{marginBottom:40}}>
        <div style={{fontSize:9,fontWeight:600,letterSpacing:4,textTransform:"uppercase",color:C.gold,marginBottom:14}}>Paso 1 — Contexto operativo</div>
        <div style={{fontFamily:"Georgia,serif",fontSize:32,color:C.black,marginBottom:10,lineHeight:1.2}}>¿Qué operación<br/>estás evaluando?</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>El contexto calibra el análisis y la arquitectura legal. Reporte: <strong style={{color:C.ink}}>USD {ESTUDIO.precio_reporte}</strong>.</div>
      </div>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderTop:`3px solid ${C.gold}`,padding:"28px 32px",marginBottom:2}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.gold,marginBottom:20}}>La Operación</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
          <div>{lbl("Monto (USD) *")}{inp(ctx.monto,v=>set("monto",v),"Ej: 15000","number")}</div>
          <div>{lbl("Plazo (meses)")}{inp(ctx.plazo,v=>set("plazo",v),"Ej: 12","number")}</div>
        </div>
        <div>{lbl("Tipo *")}{sel(ctx.tipo_operacion,v=>set("tipo_operacion",v),tiposOp)}</div>
      </div>
      <div style={{background:C.white,border:`1px solid ${C.border}`,padding:"28px 32px",marginBottom:2}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.gold,marginBottom:20}}>Relación con el Sujeto</div>
        <div style={{marginBottom:ctx.relacion_previa!=="ninguna"?20:0}}>{lbl("Relación previa")}{sel(ctx.relacion_previa,v=>set("relacion_previa",v),relOpts)}</div>
        {ctx.relacion_previa!=="ninguna"&&<div>{lbl("Detalle")}{inp(ctx.historial_pago,v=>set("historial_pago",v),"Ej: 2 operaciones anteriores, siempre pagó en término")}</div>}
      </div>
      <div style={{background:C.white,border:`1px solid ${C.border}`,padding:"28px 32px",marginBottom:28}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.gold,marginBottom:20}}>Garantía Ofrecida</div>
        <div style={{marginBottom:ctx.garantia_ofrecida?20:0}}>{lbl("Garantía")}{sel(ctx.garantia_ofrecida,v=>set("garantia_ofrecida",v),garOpts)}</div>
        {ctx.garantia_ofrecida&&<div>{lbl("Detalle")}{inp(ctx.garantia_detalle,v=>set("garantia_detalle",v),"Ej: Apartamento en Maldonado, valuado en USD 80.000")}</div>}
      </div>
      <button onClick={()=>ok&&onSubmit(ctx)} disabled={!ok}
        style={{width:"100%",padding:"16px",background:ok?C.black:"#ccc",color:ok?C.gold:C.white,border:"none",fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase",cursor:ok?"pointer":"not-allowed",fontFamily:"Georgia,serif"}}>
        {ok?"Continuar → Subir PDF de LIDECO":"Completá monto y tipo para continuar"}
      </button>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────
export default function App() {
  const [stage,setStage]=useState("contexto");
  const [ctx,setCtx]=useState(null);
  const [data,setData]=useState(null);
  const [verif,setVerif]=useState({pep:{},rupe:"pending"});
  const [webData,setWebData]=useState({loading:false,summary:"",hallazgos:[]});
  const [udecoData,setUdecoData]=useState(null);
  const [consistencia,setConsistencia]=useState(null);
  const [progress,setProgress]=useState("");
  const [error,setError]=useState("");
  const [dragOver,setDragOver]=useState(false);
  const [numReporte]=useState(()=>`2026-${String(Math.floor(Math.random()*900)+100)}`);
  const fileRef=useRef();

  async function procesarPDF(file) {
    setStage("loading"); setError("");
    try {
      const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      setProgress("Leyendo PDF de LIDECO...");
      const system=`Extraé datos del reporte LIDECO. SOLO JSON sin backticks: {"nombre":"","tipo_doc":"","num_doc":"","tipo_sujeto":"Persona Física o Persona Jurídica","giro":"o null","nivel_riesgo":"Alto/Medio/Bajo","total_creditos":"","atraso_usd":"","vigentes_usd":"","riesgo_potencial":"","garantias_no_comp":"0,00","tipo_cambio":"","fecha_emision":"YYYY-MM-DD o null","acreedores_detalle":[{"nombre":"","calif":"","categoria":""}]}`;
      const txt=await callClaude([{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},{type:"text",text:"Extraé los datos."}]}],system);
      const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
      setData(parsed);
      const esPJ=parsed.tipo_sujeto==="Persona Jurídica";
      setProgress("Verificando fuentes oficiales...");
      const [pepR,udR]=await Promise.all([
        esPJ?Promise.resolve({ok:true,encontrado:false,matches:[],fuente:"N/A · PJ",fecha:fmtDate()}):verificarPEP(parsed.nombre),
        esPJ?verificarUDECO(parsed.num_doc,parsed.nombre):Promise.resolve({ok:true,encontrado:false,sanciones:[],esPF:true}),
      ]);
      setVerif(v=>({...v,pep:pepR})); setUdecoData(udR);
      setProgress("Analizando consistencia biográfica...");
      const cons=await analizarConsistencia(parsed,ctx);
      setConsistencia(cons);
      setProgress("Consultando fuentes abiertas...");
      const webTxt=await callClaude([{role:"user",content:`Buscá información pública sobre "${parsed.nombre}" CI/RUT ${parsed.num_doc} Uruguay para evaluación de riesgo comercial.`}],`Analista legal uruguayo. SOLO JSON sin backticks: {"summary":"2-3 oraciones directas","hallazgos":[{"icon":"emoji","titulo":"","detalle":""}]}`,true);
      setWebData({loading:false,...JSON.parse(webTxt.replace(/```json|```/g,"").trim())});
      setStage("rupe");
    } catch(e) {
      console.error(e); setError("No se pudo procesar el PDF. Verificá que sea un reporte LIDECO válido."); setStage("upload");
    }
  }

  function reset(){setStage("contexto");setCtx(null);setData(null);setWebData({loading:false,summary:"",hallazgos:[]});setVerif({pep:{},rupe:"pending"});setUdecoData(null);setConsistencia(null);}

  const steps=["Contexto","PDF","Verificaciones","RUPE","Reporte"];
  const sIdx={contexto:0,upload:1,loading:2,rupe:3,report:4}[stage]||0;

  return (
    <div style={{fontFamily:"Georgia,'Times New Roman',serif",minHeight:"100vh",background:C.cream}}>
      <div style={{background:C.black}} className="no-print">
        <div style={{padding:"14px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #111"}}>
          <span style={{fontFamily:"Georgia,serif",fontSize:14,color:C.white,letterSpacing:2}}>{ESTUDIO.nombre}</span>
          <span style={{fontSize:9,fontWeight:600,letterSpacing:3,textTransform:"uppercase",color:C.gold}}>Sistema de Inteligencia Legal · v7</span>
        </div>
        <div style={{padding:"0 40px",display:"flex"}}>
          {steps.map((s,i)=>(
            <div key={i} style={{padding:"10px 20px",fontSize:9,fontWeight:600,letterSpacing:2,textTransform:"uppercase",color:i<=sIdx?C.gold:"#2A2A2A",borderBottom:i<=sIdx?`2px solid ${C.gold}`:"2px solid transparent",transition:"all 0.3s"}}>
              {String(i+1).padStart(2,"0")} {s}
            </div>
          ))}
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"52px 24px"}}>
        {stage==="contexto"&&<FormularioContexto onSubmit={c=>{setCtx(c);setStage("upload");}}/>}

        {stage==="upload"&&(
          <div style={{maxWidth:600,margin:"0 auto"}}>
            <div style={{marginBottom:32}}>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:4,textTransform:"uppercase",color:C.gold,marginBottom:14}}>Paso 2 — PDF de LIDECO</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:26,color:C.black,marginBottom:8}}>Subí el reporte LIDECO</div>
              <div style={{fontSize:13,color:C.muted}}><strong style={{color:C.ink}}>{ctx?.tipo_operacion}</strong> · USD {Number(ctx?.monto||0).toLocaleString("es-UY")} · {ctx?.plazo||"—"} meses</div>
            </div>
            <div onClick={()=>fileRef.current.click()}
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f?.type==="application/pdf")procesarPDF(f);else setError("El archivo debe ser un PDF.");}}
              style={{border:`2px dashed ${dragOver?C.gold:C.border}`,background:dragOver?"#FAF7F2":C.white,padding:"52px 40px",textAlign:"center",cursor:"pointer",transition:"all 0.2s",marginBottom:12}}>
              <div style={{fontSize:40,marginBottom:14}}>📄</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:16,color:C.ink,marginBottom:6}}>Arrastrá el PDF o hacé clic</div>
              <div style={{fontSize:12,color:C.muted}}>Persona Física o Jurídica</div>
              <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{if(e.target.files[0])procesarPDF(e.target.files[0]);}}/>
            </div>
            {error&&<div style={{padding:"12px 18px",background:C.redLight,border:`1px solid ${C.redBorder}`,color:C.red,fontSize:12,marginBottom:12}}>{error}</div>}
            <button onClick={()=>setStage("contexto")} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"10px 20px",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"Georgia,serif"}}>← Volver</button>
          </div>
        )}

        {stage==="loading"&&(
          <div style={{textAlign:"center",padding:"100px 40px"}}>
            <div style={{fontFamily:"Georgia,serif",fontSize:36,color:C.gold,marginBottom:20}}>⚙</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:22,color:C.black,marginBottom:10}}>Procesando</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:32}}>{progress}</div>
            <div style={{display:"flex",justifyContent:"center",gap:8}}>
              {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.gold,animation:`p 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
            </div>
            <style>{`@keyframes p{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1.2)}}`}</style>
          </div>
        )}

        {stage==="rupe"&&data&&(
          <div style={{maxWidth:500,margin:"0 auto"}}>
            <div style={{marginBottom:28}}>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:4,textTransform:"uppercase",color:C.gold,marginBottom:12}}>Paso 4 — Confirmación manual</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:24,color:C.black,marginBottom:6}}>Consultá el RUPE</div>
              <div style={{fontSize:13,color:C.muted}}>{data.nombre} · {data.num_doc}</div>
            </div>
            <div style={{background:C.white,border:`1px solid ${C.border}`,padding:"20px 24px",marginBottom:12}}>
              <a href="https://www.comprasestatales.gub.uy/rupe/clientes/publicos/BusquedaPublicaDeProveedoresCliente.jsf" target="_blank" rel="noreferrer"
                style={{display:"block",textAlign:"center",background:C.black,color:C.gold,padding:"13px",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",textDecoration:"none",fontFamily:"Georgia,serif"}}>
                → Abrir portal RUPE
              </a>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:2}}>
              {[{val:"inscripto",label:"✓ Inscripto",color:C.green,bg:C.greenLight,border:C.greenBorder},{val:"no_inscripto",label:"✗ No Inscripto",color:C.amber,bg:C.amberLight,border:C.amberBorder},{val:"pending",label:"— Sin datos",color:C.muted,bg:C.surface,border:C.border}].map(o=>(
                <button key={o.val} onClick={()=>{setVerif(v=>({...v,rupe:o.val}));setStage("report");}}
                  style={{background:o.bg,border:`1.5px solid ${o.border}`,padding:"16px",cursor:"pointer",fontFamily:"Georgia,serif",textAlign:"center"}}>
                  <div style={{fontSize:13,fontWeight:600,color:o.color}}>{o.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {stage==="report"&&data&&ctx&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}} className="no-print">
              <div>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:3,textTransform:"uppercase",color:C.gold,marginBottom:6}}>Reporte listo</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:22,color:C.black}}>{data.nombre}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={reset} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"10px 20px",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"Georgia,serif"}}>← Nuevo</button>
                <button onClick={()=>window.print()} style={{background:C.black,border:"none",color:C.gold,padding:"10px 24px",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"Georgia,serif"}}>↓ Exportar PDF</button>
              </div>
            </div>
            <div style={{boxShadow:"0 8px 80px rgba(0,0,0,.12)"}}>
              <Reporte data={data} ctx={ctx} verif={verif} webData={webData} udecoData={udecoData} consistencia={consistencia} numReporte={numReporte}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
