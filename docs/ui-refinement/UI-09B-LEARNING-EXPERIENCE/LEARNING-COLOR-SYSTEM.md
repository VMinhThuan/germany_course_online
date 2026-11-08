# Learning color system

The implementation reuses the application palette and adds only the three lettering tokens requested by the brief.

| Role                       | Treatment                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Heading lettering          | Cream `#FBEEDE`, blue outline `#5674F6`, subtle blue shadow `#4663DA`                    |
| Chapter and progress areas | Existing pastel-blue surface and border tokens                                           |
| Completed progress         | Existing lime indicator over the blue progress track                                     |
| Active lesson              | Pastel-blue surface, teal leading rule, and explicit status text                         |
| Lesson video               | Muted red accent when a published video exists                                           |
| Exercises                  | Pastel-pink background, border, and file icon                                            |
| Neutral metadata           | Darkened local secondary text `#53646C` on blue/pink surfaces to meet contrast threshold |

No global font family or unrelated page theme was changed. Exercise/video distinctions use both text and icons, and completion/current states retain labels instead of relying on color alone.
