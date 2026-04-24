import { useEffect, useMemo, useState } from 'react';
import { api } from './lib/api';
import { buildReportPayload } from './lib/reportPayload';
import KpiCard from './components/dashboard/KpiCard';
import ValidationPanel from './components/dashboard/ValidationPanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Upload, FileDown, Sparkles } from 'lucide-react';

const CHART_COLORS = [
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#06B6D4", // cyan
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#EC4899", // pink
  "#14B8A6", // teal
];

const tabList=['Overview','Benchmark','Commentary','PDF Export'];
const fundOptions = [
  'AI Growth Opportunities Fund',
  'Global Equity Leaders Fund',
  'Balanced Income Select Fund',
  'Emerging Markets Alpha Fund',
  'Sustainable Future Leaders Fund',
];
const getErrorMessage=(error,fallback)=>{const responseData=error?.response?.data;const candidate=responseData?.error??responseData?.message??responseData; if(typeof candidate==='string'&&candidate.trim()) return candidate; if(Array.isArray(candidate)) return candidate.map(item=>typeof item==='string'?item:JSON.stringify(item)).join(', '); if(candidate&&typeof candidate==='object'){if(typeof candidate.message==='string'&&candidate.message.trim()) return candidate.message; try{return JSON.stringify(candidate);}catch{return fallback;}} if(typeof error?.message==='string'&&error.message.trim()) return error.message; return fallback;};
export default function App(){const [activeTab,setActiveTab]=useState('Overview');const brandName='AI Reporting Studio';const [fundName,setFundName]=useState(fundOptions[0]);const [reportPeriod,setReportPeriod]=useState('Monthly');const [benchmarkReturn,setBenchmarkReturn]=useState(4.2);const [peer1,setPeer1]=useState(3.8);const [peer2,setPeer2]=useState(4.0);const [fundObjective]=useState('The fund seeks long-term capital appreciation by investing primarily in growth-oriented equities across diversified sectors.');const [logo,setLogo]=useState(null);const [validation,setValidation]=useState([]);const [portfolio,setPortfolio]=useState(null);const [commentary,setCommentary]=useState('');const [loading,setLoading]=useState(false);
const uploadFile=async(file)=>{const form=new FormData();form.append('portfolio',file);if(logo) form.append('logo',logo);form.append('fundName',fundName);form.append('reportPeriod',reportPeriod);form.append('benchmarkReturn',benchmarkReturn);form.append('peer1',peer1);form.append('peer2',peer2);form.append('fundObjective',fundObjective);try{const res=await api.post('/portfolio/upload',form);setPortfolio(res.data);setValidation(res.data.validation||[]);setActiveTab('Overview');}catch(error){console.error('Portfolio upload failed',error);window.alert(getErrorMessage(error,'Portfolio upload failed. Check the backend URL and try again.'));}}
const loadSample=async()=>{setLoading(true);try{const res=await api.get('/portfolio/sample');setPortfolio(res.data);setValidation(res.data.validation||[]);setActiveTab('Overview');}catch(error){console.error('Sample portfolio failed to load',error);window.alert(getErrorMessage(error,'Sample portfolio could not be loaded. Check the backend URL and CORS settings.'));}finally{setLoading(false)}}
const generateCommentary=async()=>{if(!portfolio) return;setLoading(true);try{const res=await api.post('/commentary/generate',{metrics:portfolio.metrics,riskMetrics:portfolio.riskMetrics,benchmarkData:portfolio.benchmarkData,peerData:portfolio.peerData,fundObjective});setCommentary(res.data.commentary);setActiveTab('Commentary');if(res.data.source==='fallback'&&res.data.reason){window.alert(`Commentary used fallback mode: ${res.data.reason}`);}}catch(error){console.error('Commentary generation failed',error);window.alert(getErrorMessage(error,'Commentary generation failed. Check the OpenAI key and backend logs.'));}finally{setLoading(false)}}
const reportPayload=useMemo(()=>buildReportPayload({portfolio,commentary,fundName,reportPeriod,fundObjective,brandName}),[portfolio,commentary,fundName,reportPeriod,fundObjective,brandName]);
useEffect(()=>{if(reportPayload){window.localStorage.setItem('ai-reporting-studio:report-payload',JSON.stringify(reportPayload));window.__REPORT_DATA__=reportPayload;}},[reportPayload]);
const downloadPdf=async()=>{if(!reportPayload) return;setLoading(true);try{const res=await api.post('/pdf/generate',reportPayload,{responseType:'blob'});const pdfBlob=new Blob([res.data],{type:'application/pdf'});if(pdfBlob.size===0){throw new Error('Empty PDF received from server.')}const url=window.URL.createObjectURL(pdfBlob);const a=document.createElement('a');a.href=url;a.download='ai_reporting_studio_factsheet.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>window.URL.revokeObjectURL(url),1000);}catch(error){console.error('PDF download failed',error);window.alert(getErrorMessage(error,'PDF download failed. Please check that the backend server is running and try again.'));}finally{setLoading(false)}}
const sectorData=useMemo(()=>portfolio?.sectorPerformance||[],[portfolio]);const allocationData=useMemo(()=>portfolio?.allocation||[],[portfolio]);const benchmarkChart=[{name:'Fund',value:portfolio?.metrics?.avg_return||0},{name:'Benchmark',value:portfolio?.benchmarkData?.benchmark_return||0},{name:'Peer 1',value:portfolio?.peerData?.peer_1_return||0},{name:'Peer 2',value:portfolio?.peerData?.peer_2_return||0}];
return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.25),_transparent_20%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_20%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
          <div className="max-w-7xl mx-auto p-6">
              {/* <div className="grid grid-cols-12 gap-6"> */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* <aside className="col-span-12 lg:col-span-4 card h-fit sticky top-6"> */}
                <aside className="w-full lg:w-[340px] xl:w-[380px] shrink-0 card h-fit sticky top-6">
                  <div className="text-xl font-semibold mb-4">AI Reporting Studio</div>

                  <div className="space-y-4">
                    <div className="form-row">
                      <label className="form-label">Fund Name</label>
                      <select className="input flex-1" value={fundName} onChange={e=>setFundName(e.target.value)}>
                        {fundOptions.map(o=><option key={o}>{o}</option>)}
                      </select>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Report Period</label>
                      <select className="input flex-1" value={reportPeriod} onChange={e=>setReportPeriod(e.target.value)}>
                        <option>Monthly</option>
                        <option>Quarterly</option>
                      </select>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Benchmark Return (%)</label>
                      <input className="input flex-1" type="number" value={benchmarkReturn}
                        onChange={e=>setBenchmarkReturn(Number(e.target.value))}/>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Peer 1 Return (%)</label>
                      <input className="input flex-1" type="number" value={peer1}
                        onChange={e=>setPeer1(Number(e.target.value))}/>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Peer 2 Return (%)</label>
                      <input className="input flex-1" type="number" value={peer2}
                        onChange={e=>setPeer2(Number(e.target.value))}/>
                    </div>

                    <div className="form-column">
                      <label className="form-label">Fund Objective</label>
                      <textarea className="input min-h-24 bg-slate-900/60 text-slate-300"
                        value={fundObjective} readOnly/>
                    </div>

                    <div className="form-row items-center">
                      <label className="form-label">Logo Upload</label>
                      <input className="input flex-1" type="file"
                        onChange={e=>setLogo(e.target.files?.[0]||null)} />
                    </div>

                    <button className="btn w-full" onClick={loadSample}>
                      {loading?'Loading...':'Use Sample Portfolio'}
                    </button>

                    <label className="btn w-full cursor-pointer">
                      <Upload className="w-4 h-4 mr-2"/>
                      Upload Portfolio CSV
                      <input hidden type="file"
                        onChange={e=>e.target.files?.[0]&&uploadFile(e.target.files[0])}/>
                    </label>
                  </div>
                </aside>
                
                {/* <aside className="col-span-12 lg:col-span-3 card h-fit sticky top-6"><div className="text-xl font-semibold mb-4">AI Reporting Studio</div><div className="space-y-4"><div className="form-row"><label htmlFor={sidebarFields[0].id} className="form-label">{sidebarFields[0].label}</label><select id={sidebarFields[0].id} className="input flex-1" value={fundName} onChange={e=>setFundName(e.target.value)}>{fundOptions.map(option=><option key={option} value={option}>{option}</option>)}</select></div><div className="form-row"><label htmlFor={sidebarFields[1].id} className="form-label">{sidebarFields[1].label}</label><select id={sidebarFields[1].id} className="input flex-1" value={reportPeriod} onChange={e=>setReportPeriod(e.target.value)}><option>Monthly</option><option>Quarterly</option></select></div><div className="form-row"><label htmlFor={sidebarFields[2].id} className="form-label">{sidebarFields[2].label}</label><input id={sidebarFields[2].id} className="input flex-1" type="number" step="0.1" value={benchmarkReturn} onChange={e=>setBenchmarkReturn(Number(e.target.value))} /></div><div className="form-row"><label htmlFor={sidebarFields[3].id} className="form-label">{sidebarFields[3].label}</label><input id={sidebarFields[3].id} className="input flex-1" type="number" step="0.1" value={peer1} onChange={e=>setPeer1(Number(e.target.value))} /></div><div className="form-row"><label htmlFor={sidebarFields[4].id} className="form-label">{sidebarFields[4].label}</label><input id={sidebarFields[4].id} className="input flex-1" type="number" step="0.1" value={peer2} onChange={e=>setPeer2(Number(e.target.value))} /></div><div className="space-y-1.5"><label htmlFor={sidebarFields[5].id} className="form-label">{sidebarFields[5].label}</label><textarea id={sidebarFields[5].id} className="input min-h-24 bg-slate-900/60 text-slate-300" value={fundObjective} readOnly /></div><div className="form-row items-center"><label htmlFor={sidebarFields[6].id} className="form-label">{sidebarFields[6].label}</label><input id={sidebarFields[6].id} className="input flex-1" type="file" accept="image/*" onChange={e=>setLogo(e.target.files?.[0]||null)} /></div><button className="btn w-full" onClick={loadSample}>{loading?'Loading...':'Use Sample Portfolio'}</button><label className="btn w-full cursor-pointer"><Upload className="w-4 h-4 mr-2"/>Upload Portfolio CSV<input hidden type="file" accept=".csv" onChange={e=>e.target.files?.[0]&&uploadFile(e.target.files[0])} /></label></div>
                </aside> */}
                <main className="flex-1 min-w-0 space-y-6"><div className="card flex items-center justify-between"><div><div className="text-sm uppercase tracking-[0.2em] text-indigo-300">{brandName}</div><h1 className="text-3xl font-bold mt-1">{fundName}</h1><p className="text-slate-400 mt-1">Dark-mode AI reporting workflow for capital markets and wealth management.</p></div>{logo&&<img src={URL.createObjectURL(logo)} className="w-20 h-20 object-contain rounded-2xl bg-white/5 p-2" />}</div><ValidationPanel messages={validation}/><div className="flex flex-wrap gap-2">{tabList.map(tab=><button key={tab} onClick={()=>setActiveTab(tab)} className={`px-4 py-2 rounded-xl border ${activeTab===tab?'bg-indigo-500 text-white border-indigo-400':'bg-white/5 border-white/10 text-slate-300'}`}>{tab}</button>)}</div>{portfolio&&activeTab==='Overview'&&<><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"><KpiCard label="Average Return" value={`${portfolio.metrics.avg_return.toFixed(2)}%`} /><KpiCard label="Total Return" value={`${portfolio.metrics.total_return.toFixed(2)}%`} /><KpiCard label="Volatility" value={`${portfolio.riskMetrics.volatility.toFixed(2)}%`} /><KpiCard label="Sharpe Ratio" value={portfolio.riskMetrics.sharpe_ratio.toFixed(2)} /><KpiCard label="Top Performer" value={portfolio.metrics.top_stock} sub={`${portfolio.metrics.top_return.toFixed(2)}%`} /><KpiCard label="Worst Performer" value={portfolio.metrics.worst_stock} sub={`${portfolio.metrics.worst_return.toFixed(2)}%`} /></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><div className="card h-80"><div className="font-semibold mb-4">Portfolio Allocation</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={95}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {allocationData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                          color: "#f8fafc"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  </div><div className="card h-80"><div className="font-semibold mb-4">Sector Performance</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="name"
                        stroke="#cbd5e1"
                        tick={{ fill: "#cbd5e1", fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#cbd5e1"
                        tick={{ fill: "#cbd5e1", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                          color: "#f8fafc"
                        }}
                        labelStyle={{ color: "#f8fafc" }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#6366F1"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  </div></div></>}{portfolio&&activeTab==='Benchmark'&&<div className="card h-[420px]"><div className="font-semibold mb-4">Fund vs Benchmark vs Peers</div>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={benchmarkChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="name"
                        stroke="#cbd5e1"
                        tick={{ fill: "#cbd5e1", fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#cbd5e1"
                        tick={{ fill: "#cbd5e1", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                          color: "#f8fafc"
                        }}
                        labelStyle={{ color: "#f8fafc" }}
                      />
                      <Bar
                        dataKey="value"
                        radius={[8, 8, 0, 0]}
                      >
                        {benchmarkChart.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer><ResponsiveContainer width="100%" height="90%">
                    <BarChart data={benchmarkChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="name"
                        stroke="#cbd5e1"
                        tick={{ fill: "#cbd5e1", fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#cbd5e1"
                        tick={{ fill: "#cbd5e1", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                          color: "#f8fafc"
                        }}
                        labelStyle={{ color: "#f8fafc" }}
                      />
                      <Bar
                        dataKey="value"
                        radius={[8, 8, 0, 0]}
                      >
                        {benchmarkChart.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  </div>}{portfolio&&activeTab==='Commentary'&&<div className="space-y-4"><div className="card"><div className="flex items-center justify-between"><div className="font-semibold">AI Commentary</div><button className="btn" onClick={generateCommentary}><Sparkles className="w-4 h-4 mr-2"/>{loading?'Generating...':'Generate Commentary'}</button></div></div>{commentary&&<><div className="card whitespace-pre-wrap leading-7 text-slate-200">{commentary}</div><div className="card"><div className="font-semibold mb-3">Email-ready Commentary</div><textarea className="input min-h-56" value={`Subject: ${fundName} - ${reportPeriod} Fund Commentary\n\nDear Client,\n\n${commentary}\n\nRegards,\nInvestment Reporting Team`} readOnly /></div></>}</div>}{portfolio&&activeTab==='PDF Export'&&<div className="card"><div className="font-semibold mb-4">Export Factsheet</div><button className="btn" onClick={downloadPdf} disabled={loading}><FileDown className="w-4 h-4 mr-2"/>{loading?'Preparing PDF...':'Download PDF'}</button></div>}
              </main>
            </div>
          </div>
        </div>}
