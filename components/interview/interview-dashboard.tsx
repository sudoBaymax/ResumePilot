"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import type { Interview } from "@/lib/supabase"
import { Plus, Mic, FileText, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InterviewDashboardProps {
  userId: string
}

export function InterviewDashboard({ userId }: InterviewDashboardProps) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchInterviews()
  }, [userId])

  const fetchInterviews = async () => {
    try {
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setInterviews(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load interviews",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createNewInterview = async () => {
    try {
      const { data, error } = await supabase
        .from("interviews")
        .insert([
          {
            user_id: userId,
            title: `Interview ${new Date().toLocaleDateString()}`,
          },
        ])
        .select()
        .single()

      if (error) throw error

      setInterviews([data, ...interviews])
      toast({
        title: "Interview created!",
        description: "Your new interview session is ready.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create interview",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Interviews</h2>
          <p className="text-gray-600">Manage your resume interview sessions</p>
        </div>
        <Button onClick={createNewInterview} className="bg-gradient-to-r from-blue-600 to-purple-600">
          <Plus className="w-4 h-4 mr-2" />
          New Interview
        </Button>
      </div>

      {interviews.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No interviews yet</h3>
            <p className="text-gray-600 mb-4">Start your first voice interview to generate your resume</p>
            <Button onClick={createNewInterview} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Start First Interview
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {interviews.map((interview) => (
            <Card key={interview.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{interview.title}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(interview.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    <FileText className="w-3 h-3 mr-1" />
                    Draft
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Mic className="w-4 h-4 mr-1" />
                    Continue Interview
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-1" />
                    View Resume
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
