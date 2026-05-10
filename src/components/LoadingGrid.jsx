import { useTheme } from '../context/ThemeContext'

export function LoadingGrid({ count = 8 }) {
  const { T } = useTheme();
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:18}}>
      {Array.from({length:count}).map((_,i)=>(
        <div key={i} className="shimmer" style={{borderRadius:18,overflow:"hidden",
          background:T.surf,
          boxShadow:`0 2px 16px rgba(0,0,0,${T.dark?.12:.06})`,
          animationDelay:`${i*120}ms`}}>
          <div style={{paddingTop:"133%",background:T.surf2}}/>
          <div style={{padding:"10px 12px 14px",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{height:13,borderRadius:6,background:T.surf2,width:"85%"}}/>
            <div style={{height:11,borderRadius:6,background:T.surf2,width:"55%"}}/>
          </div>
        </div>
      ))}
    </div>
  );
}
