import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TeamSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Team Settings</CardTitle>
                <CardDescription>
                    Edit your team's details, banner, and recruitment status. This feature is coming soon!
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">The ability to manage team settings will be added in a future update.</p>
            </CardContent>
        </Card>
    )
}
