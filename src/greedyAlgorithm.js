// Scholarship allocation using Greedy Algorithm
class ScholarshipAllocation {
    constructor(budget, scholarshipSlabs) {
        this.totalBudget = budget;
        this.scholarshipSlabs = scholarshipSlabs;
        this.allocatedScholarships = new Map();
    }

    // Calculate student score based on multiple criteria
    calculateStudentScore(student) {
        const {
            academicScore,
            familyIncome,
            extraCurricular,
            specialQuota
        } = student;

        // Weighted scoring system
        const weights = {
            academic: 0.4,
            financial: 0.3,
            extraCurricular: 0.2,
            specialQuota: 0.1
        };

        // Normalize family income (inverse relationship - lower income gets higher score)
        const maxIncome = 1000000; // 10 Lakhs as maximum consideration
        const normalizedIncome = 1 - (familyIncome / maxIncome);

        return (
            (academicScore * weights.academic) +
            (normalizedIncome * weights.financial) +
            (extraCurricular * weights.extraCurricular) +
            (specialQuota ? weights.specialQuota : 0)
        );
    }

    // Sort students by their composite score
    sortStudentsByMerit(students) {
        return students.sort((a, b) =>
            this.calculateStudentScore(b) - this.calculateStudentScore(a)
        );
    }

    // Find the best fitting scholarship slab for a student
    findBestFittingSlab(student) {
        return this.scholarshipSlabs
            .filter(slab => student.academicScore >= slab.minScore &&
                student.familyIncome <= slab.maxIncome)
            .sort((a, b) => b.amount - a.amount)[0];
    }

    // Main allocation algorithm
    allocateScholarships(students) {
        let remainingBudget = this.totalBudget;
        const sortedStudents = this.sortStudentsByMerit(students);

        for (const student of sortedStudents) {
            const bestSlab = this.findBestFittingSlab(student);

            if (bestSlab && bestSlab.amount <= remainingBudget) {
                this.allocatedScholarships.set(student.id, {
                    student,
                    slab: bestSlab,
                    score: this.calculateStudentScore(student)
                });
                remainingBudget -= bestSlab.amount;
            }
        }

        return {
            allocations: this.allocatedScholarships,
            remainingBudget,
            totalAllocated: this.totalBudget - remainingBudget
        };
    }
}

export default ScholarshipAllocation;