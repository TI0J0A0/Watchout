import { useTheme } from '../context/ThemeContext'

export function Toast({ message }) {
  const { T } = useTheme();
  return (
    <div style={{position:"fixed",bottom:"max(28px, env(safe-area-inset-bottom, 28px))",
      left:"50%",transform:"translateX(-50%)",
      zIndex:9999,padding:"12px 24px",borderRadius:24,fontSize:13,fontWeight:500,
      background:T.dark?"rgba(28,28,30,.92)":"rgba(0,0,0,.84)",color:"#fff",
      backdropFilter:"blur(24px) saturate(180%)",
      boxShadow:"0 4px 24px rgba(0,0,0,.32)",
      border:`1px solid rgba(255,255,255,.1)`,
      animation:"toastIn .22s ease both",whiteSpace:"nowrap"}}>
      {message}
    </div>
  );
}
