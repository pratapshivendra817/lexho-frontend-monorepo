export const Loader = ({ label = 'Loading...' }: { label?: string }) => {
  return <div aria-busy="true">{label}</div>
}
