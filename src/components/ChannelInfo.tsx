import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function ChannelInfo() {
  return (
    <Card
      className="w-full max-w-md rounded-xl shadow-md 
                 bg-white text-black 
                 dark:bg-card dark:text-card-foreground"
    >
      <CardHeader>
        <CardTitle>Channel Info</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This is the channel info box.</p>
      </CardContent>
    </Card>
  )
}
