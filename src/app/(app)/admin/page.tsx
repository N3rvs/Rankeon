import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function AdminPage() {
    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle className="font-headline text-3xl">Admin Dashboard</CardTitle>
                            <CardDescription>Welcome, administrator. This is your command center.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p>This page is only visible to users with the 'admin' role. You can now add admin-specific functionality here.</p>
                </CardContent>
            </Card>
        </div>
    )
}
