import { useTheme } from '../context/ThemeContext'

export function StatBox({ label, val, color, icon, fill }) {
  const { T } = useTheme();
  return (
    <div style={{
      padding:"16px 18px",
      borderRadius:18,
      flex: fill ? "1 1 0" : "none",
      background: color ? `${color}10` : T.surf2,
      border: `1px solid ${color ? `${color}22` : T.bord}`,
    }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <p style={{fontSize:11.5,fontWeight:500,color:color ?? T.sub,
          letterSpacing:".02em"}}>{label}</p>
        {icon && (
          <div style={{width:28,height:28,borderRadius:9,
            background: color ? `${color}16` : T.surf,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:13}}>
            {icon}
          </div>
        )}
      </div>
      <p style={{fontSize:26,fontWeight:700,color:color ?? T.txt,
        letterSpacing:"-.03em",lineHeight:1}}>{val}</p>
    </div>
  );
}
